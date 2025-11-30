"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.employeeSyncWorker = void 0;
exports.startWorker = startWorker;
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const api_1 = require("@opentelemetry/api");
const rate_limiter_flexible_1 = require("rate-limiter-flexible");
const opossum_1 = __importDefault(require("opossum"));
const p_limit_1 = __importDefault(require("p-limit"));
const supabaseClient_1 = require("./supabaseClient");
const hikvisionErrors_1 = require("./hikvisionErrors");
const hikvision_sdk_1 = require("./hikvision.sdk"); // Updated import
const redisConnection = new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
});
const tracer = api_1.trace.getTracer('hikvision-proxy-worker');
// Create a rate limiter that allows 5 actions per second per deviceId.
const deviceLimiter = new rate_limiter_flexible_1.RateLimiterRedis({
    storeClient: redisConnection,
    keyPrefix: 'rate-limit-device',
    points: 5, // 5 requests
    duration: 1, // per 1 second
});
// Cache for circuit breakers, one per device
const circuitBreakers = new Map();
const concurrencyLimiters = new Map();
const getCircuitBreaker = (deviceId) => {
    if (!circuitBreakers.has(deviceId)) {
        const options = {
            timeout: 15000, // If the function takes longer than 15s, trigger a failure
            errorThresholdPercentage: 50, // When 50% of requests fail, open the circuit
            resetTimeout: 30000, // After 30s, try again.
        };
        const breaker = new opossum_1.default(async (action) => action(), options);
        // Log state changes for observability
        breaker.on('open', () => console.warn(`[CircuitBreaker] Breaker for device ${deviceId} has opened.`));
        breaker.on('close', () => console.log(`[CircuitBreaker] Breaker for device ${deviceId} has closed. Resuming normal operations.`));
        breaker.on('fallback', () => console.log(`[CircuitBreaker] Fallback triggered for device ${deviceId}.`));
        circuitBreakers.set(deviceId, breaker);
    }
    return circuitBreakers.get(deviceId);
};
const getConcurrencyLimiter = (deviceId) => {
    if (!concurrencyLimiters.has(deviceId)) {
        // Limit to 2 concurrent operations per device
        concurrencyLimiters.set(deviceId, (0, p_limit_1.default)(2));
    }
    return concurrencyLimiters.get(deviceId);
};
/**
 * Updates the sync status of an employee in the database.
 * @param employeeId The ID of the employee.
 * @param status The new sync status.
 * @param errorDetails Optional error details if the status is 'failed'.
 */
async function updateEmployeeSyncStatus(employeeId, status, errorDetails = null) {
    const { error } = await supabaseClient_1.supabase
        .from('employees')
        .update({ sync_status: status, metadata: { ...(errorDetails ? { sync_error: errorDetails } : {}) } })
        .eq('id', employeeId);
    if (error) {
        console.error(`[Worker] CRITICAL: Failed to update sync_status for employee ${employeeId}`, error);
    }
}
/**
 * The worker that processes jobs from the 'employee-sync' queue.
 */
exports.employeeSyncWorker = new bullmq_1.Worker('employee-sync', async (job) => {
    const { employeeId, traceData } = job.data;
    // Rehydrate the trace context from the job's data
    const tracer = api_1.trace.getTracer('employee-sync-worker');
    const parentContext = traceData?.traceId ?
        api_1.propagation.extract(api_1.context.active(), traceData) : undefined;
    const ctx = parentContext ? api_1.trace.setSpan(api_1.context.active(), api_1.trace.getSpan(parentContext)) : api_1.context.active();
    return api_1.context.with(ctx, async () => {
        const span = tracer.startSpan('process-employee-sync-job', undefined, ctx);
        try {
            span.setAttributes({
                'messaging.system': 'bullmq',
                'messaging.message_id': job.id,
                'job.name': job.name,
                'job.attempts': job.attemptsMade,
            });
            // Fetch fresh employee data inside the job for idempotency
            const { data: employeeData, error: employeeError } = await supabaseClient_1.supabase
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
            const { data: devices, error: devicesError } = await supabaseClient_1.supabase
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
                        const span = api_1.trace.getSpan(api_1.context.active());
                        span?.addEvent('Concurrency lock passed. Attempting to acquire rate limit token.');
                        await deviceLimiter.consume(device.id);
                        span?.addEvent('Rate limit token acquired. Firing circuit breaker.');
                        const result = await breaker.fire(async () => {
                            console.log(`[Worker] -> Syncing to device: ${device.name} (${device.ip_address})`);
                            const decryptedPassword = `decrypted-${device.password_encrypted}`;
                            const hikvisionClient = new hikvision_sdk_1.HikvisionSDK({
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
                }
                catch (error) {
                    const span = api_1.trace.getSpan(api_1.context.active());
                    const translatedError = (0, hikvisionErrors_1.translateHikvisionError)(error, device.id);
                    span?.recordException(error);
                    span?.setAttributes({
                        'error.isapi.description': translatedError.description,
                        'error.isapi.severity': translatedError.severity,
                        'error.isapi.retryable': translatedError.retryable,
                        'error.isapi.debugSuggestion': translatedError.debugSuggestion,
                        'isapi.response.raw': translatedError.rawError,
                    });
                    span?.setStatus({ code: api_1.SpanStatusCode.ERROR, message: translatedError.description });
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
                        finalError.isFinal = true; // Mark error as not to be retried by BullMQ
                        throw finalError;
                    }
                    throw new Error(translatedError.description);
                }
            });
            const results = await Promise.allSettled(syncPromises);
            const failedDevices = [];
            for (const result of results) {
                if (result.status === 'fulfilled') {
                    const value = result.value;
                    if (!value.success) {
                        failedDevices.push({ deviceId: value.deviceId, error: value.error });
                    }
                }
                else {
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
            span.setStatus({ code: api_1.SpanStatusCode.OK });
            span.end();
            return { success: true, results };
        }
        catch (error) {
            span.recordException(error);
            span.setStatus({ code: api_1.SpanStatusCode.ERROR, message: error.message });
            span.end();
            throw error;
        }
    });
}, {
    connection: redisConnection,
    concurrency: 10,
});
exports.employeeSyncWorker.on('completed', job => {
    console.log(`[Worker] Job ${job.id} has completed!`);
});
exports.employeeSyncWorker.on('failed', async (job, err) => {
    console.error(`[Worker] Job ${job?.id} has FAILED DEFINITIVELY with error: ${err.message}`);
    if (job?.data.employeeId) {
        await updateEmployeeSyncStatus(job.data.employeeId, 'failed', { error: err.message, jobId: job.id });
    }
});
function startWorker() {
    console.log('[Worker] Employee sync worker started.');
}
