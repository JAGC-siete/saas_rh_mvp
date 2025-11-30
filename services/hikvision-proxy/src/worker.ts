import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { trace, context, propagation, SpanStatusCode } from '@opentelemetry/api';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import CircuitBreaker from 'opossum';
import pLimit from 'p-limit';
import { supabase } from './supabaseClient';
import { translateHikvisionError } from './hikvisionErrors';
import { HikvisionSDK } from './hikvision.sdk'; // Updated import

const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

const tracer = trace.getTracer('hikvision-proxy-worker');

// Create a rate limiter that allows 5 actions per second per deviceId.
const deviceLimiter = new RateLimiterRedis({
  storeClient: redisConnection,
  keyPrefix: 'rate-limit-device',
  points: 5, // 5 requests
  duration: 1, // per 1 second
});

// Cache for circuit breakers, one per device
const circuitBreakers: Map<string, CircuitBreaker> = new Map();

// Cache for concurrency limiters, one per device
type Limit = ReturnType<typeof pLimit>;
const concurrencyLimiters: Map<string, Limit> = new Map();

const getCircuitBreaker = (deviceId: string): CircuitBreaker => {
  if (!circuitBreakers.has(deviceId)) {
    const options: CircuitBreaker.Options = {
      timeout: 15000, // If the function takes longer than 15s, trigger a failure
      errorThresholdPercentage: 50, // When 50% of requests fail, open the circuit
      resetTimeout: 30000, // After 30s, try again.
    };
    const breaker = new CircuitBreaker(async (action: () => Promise<any>) => action(), options);
    
    // Log state changes for observability
    breaker.on('open', () => console.warn(`[CircuitBreaker] Breaker for device ${deviceId} has opened.`));
    breaker.on('close', () => console.log(`[CircuitBreaker] Breaker for device ${deviceId} has closed. Resuming normal operations.`));
    breaker.on('fallback', () => console.log(`[CircuitBreaker] Fallback triggered for device ${deviceId}.`));

    circuitBreakers.set(deviceId, breaker);
  }
  return circuitBreakers.get(deviceId)!;
};

const getConcurrencyLimiter = (deviceId: string): ReturnType<typeof pLimit> => {
  if (!concurrencyLimiters.has(deviceId)) {
    // Limit to 2 concurrent operations per device
    concurrencyLimiters.set(deviceId, pLimit(2));
  }
  return concurrencyLimiters.get(deviceId)!;
};

/**
 * Updates the sync status of an employee in the database.
 * @param employeeId The ID of the employee.
 * @param status The new sync status.
 * @param errorDetails Optional error details if the status is 'failed'.
 */
async function updateEmployeeSyncStatus(employeeId: string, status: 'synced' | 'failed', errorDetails: object | null = null) {
  const { error } = await supabase
    .from('employees')
    .update({ sync_status: status, metadata: { ... (errorDetails ? { sync_error: errorDetails } : {}) } })
    .eq('id', employeeId);

  if (error) {
    console.error(`[Worker] CRITICAL: Failed to update sync_status for employee ${employeeId}`, error);
  }
}

/**
 * The worker that processes jobs from the 'employee-sync' queue.
 */
export const employeeSyncWorker = new Worker('employee-sync', 
  async (job: Job) => {
    const { employeeId, traceData } = job.data;
    
    // Rehydrate the trace context from the job's data
    const tracer = trace.getTracer('employee-sync-worker');
    const parentContext = traceData?.traceId ? 
      propagation.extract(context.active(), traceData) : undefined;

    const ctx = parentContext ? trace.setSpan(context.active(), trace.getSpan(parentContext)!) : context.active();

    return context.with(ctx, async () => {
      const span = tracer.startSpan('process-employee-sync-job', undefined, ctx);
      try {
          span.setAttributes({
            'messaging.system': 'bullmq',
            'messaging.message_id': job.id,
            'job.name': job.name,
            'job.attempts': job.attemptsMade,
          });

          // Fetch fresh employee data inside the job for idempotency
          const { data: employeeData, error: employeeError } = await supabase
              .from('employees')
              .select('id, dni, name, company_id')
              .eq('id', employeeId)
              .single();

          if (employeeError || !employeeData) {
              throw new Error(`Could not fetch employee ${employeeId}. Error: ${employeeError?.message}`);
          }

          const companyId = employeeData.company_id;
          span.setAttributes({
            'job.company_id': companyId,
            'job.employee_dni': employeeData.dni,
          });

          console.log(`[Worker] Processing job ${job.id} for company ${companyId}, employee DNI: ${employeeData.dni}`);

          // 1. Find all active devices for the given company
          const { data: devices, error: devicesError } = await supabase
            .from('devices')
            .select('id, ip_address, port, username, password_encrypted, name')
            .eq('company_id', companyId)
            .eq('is_active', true);

          if (devicesError) {
            throw new Error(`Could not fetch devices for company ${companyId}. Error: ${devicesError.message}`);
          }

          if (!devices || devices.length === 0) {
            console.log(`[Worker] No active devices found for company ${companyId}. Job ${job.id} will be marked as complete.`);
            return { success: true, message: 'No active devices to sync to.' };
          }

          console.log(`[Worker] Found ${devices.length} devices for company ${companyId}. Starting sync for employee ${employeeData.name}.`);

          // 2. Iterate and sync to each device
          const syncPromises = devices.map(async (device) => {
            const breaker = getCircuitBreaker(device.id);
            const limit = getConcurrencyLimiter(device.id);

            try {
              // The job will wait here if the concurrency limit for this device is reached.
              return await limit(async () => {
                const span = trace.getSpan(context.active());
                span?.addEvent('Concurrency lock passed. Attempting to acquire rate limit token.');

                await deviceLimiter.consume(device.id);
                span?.addEvent('Rate limit token acquired. Firing circuit breaker.');

                const result = await breaker.fire(async () => {
                  console.log(`[Worker] -> Syncing to device: ${device.name} (${device.ip_address})`);
                  const decryptedPassword = `decrypted-${device.password_encrypted}`;

                  const hikvisionClient = new HikvisionSDK({
                    host: device.ip_address,
                    port: device.port,
                    user: device.username,
                    pass: decryptedPassword,
                  });

                  span?.setAttributes({
                    'isapi.endpoint': '/ISAPI/AccessControl/UserInfo/SetUp',
                    'device.ip': device.ip_address,
                    'device.name': device.name,
                  });

                  const syncResult = await hikvisionClient.userInfoSetUp({
                    employeeNo: employeeData.dni,
                    name: employeeData.name,
                  });
                  
                  span?.setAttributes({
                    'isapi.response.statusString': syncResult.statusString,
                    'isapi.response.statusCode': syncResult.statusCode,
                  });
                  span?.addEvent('Successfully synced to device.');
                  
                  console.log(`[Worker] -> Successfully synced to device ${device.name}`, syncResult);
                  return { deviceId: device.id, success: true, result: syncResult };
                });

                return result;
              });

            } catch (error: any) {
              const span = trace.getSpan(context.active());
              const translatedError = translateHikvisionError(error, device.id);

              span?.recordException(error);
              span?.setAttributes({
                'error.isapi.description': translatedError.description,
                'error.isapi.severity': translatedError.severity,
                'error.isapi.retryable': translatedError.retryable,
                'error.isapi.debugSuggestion': translatedError.debugSuggestion,
                'isapi.response.raw': translatedError.rawError,
              });
              span?.setStatus({ code: SpanStatusCode.ERROR, message: translatedError.description });

              console.error(`[Worker] -> FAILED to sync to device ${device.name}. `, {
                ...translatedError,
                isBreakerError: error.name === 'BreakerOpenError' || error.name === 'BreakerFailure'
              });

              // IMPORTANT: Logic to control BullMQ's retry
              // If the error is NOT retryable, we want to fail the job permanently.
              if (!translatedError.retryable) {
                // By re-throwing an error with a specific flag or type,
                // we can catch it later and prevent BullMQ from retrying.
                const finalError = new Error(translatedError.description);
                (finalError as any).isFinal = true; // Mark error as not to be retried by BullMQ
                throw finalError;
              }

              throw new Error(translatedError.description);
            }
          });
          
          const results = await Promise.allSettled(syncPromises);
          const failedDevices: Array<{ deviceId: string; error?: string }> = [];
          
          for (const result of results) {
            if (result.status === 'fulfilled') {
              const value = result.value as { deviceId: string; success: boolean; error?: string };
              if (!value.success) {
                failedDevices.push({ deviceId: value.deviceId, error: value.error });
              }
            } else {
              // Rejected promises are also considered failures
              failedDevices.push({ deviceId: 'unknown', error: result.reason?.message || 'Promise rejected' });
            }
          }

          if (failedDevices.length > 0) {
            const errorInfo = {
              message: `Failed to sync to ${failedDevices.length}/${devices.length} devices.`,
              failedDevices,
            };
            throw new Error(JSON.stringify(errorInfo));
          }
          
          await updateEmployeeSyncStatus(employeeData.id, 'synced');
          console.log(`[Worker] Successfully synced employee ${employeeData.dni} to all devices. Job complete.`);
          span.setStatus({ code: SpanStatusCode.OK });
          span.end();
          return { success: true, results };

        } catch (error: any) {
          span.recordException(error);
          span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
          span.end();
          throw error;
        }
    });
  }, 
  { 
    connection: redisConnection,
    concurrency: 10,
  }
);

employeeSyncWorker.on('completed', job => {
  console.log(`[Worker] Job ${job.id} has completed!`);
});

employeeSyncWorker.on('failed', async (job, err) => {
  console.error(`[Worker] Job ${job?.id} has FAILED DEFINITIVELY with error: ${err.message}`);
  if (job?.data.employeeId) {
    await updateEmployeeSyncStatus(job.data.employeeId, 'failed', { error: err.message, jobId: job.id });
  }
});

export function startWorker() {
  console.log('[Worker] Employee sync worker started.');
}
