import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { trace, context, propagation } from '@opentelemetry/api';

// Ensure we only have one instance of Redis and Queue
let redis: Redis | undefined;
let employeeSyncQueue: Queue | undefined;

const getRedisInstance = () => {
  if (!redis) {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      throw new Error('REDIS_URL is not defined in environment variables.');
    }
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
    });
  }
  return redis;
};

export const getEmployeeSyncQueue = () => {
  if (!employeeSyncQueue) {
    const connection = getRedisInstance();
    employeeSyncQueue = new Queue('employee-sync', { connection });
  }
  return employeeSyncQueue;
};

/**
 * Adds an employee synchronization job to the queue for all active devices in a company.
 * @param companyId - The ID of the company the employee belongs to.
 * @param employeeData - The data of the employee to sync.
 */
export const addEmployeeSyncJob = async (companyId: string, employeeData: any) => {
  try {
    const queue = getEmployeeSyncQueue();
    const jobName = `sync-employee-${employeeData.id}-for-company-${companyId}`;
    const jobId = jobName;

    // Create a new span for adding the job to the queue
    const tracer = trace.getTracer('saas-queue-producer');
    await tracer.startActiveSpan(`add-job:${jobName}`, async (span) => {
      const jobOptions: any = {
        jobId,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      };

      // *** CRITICAL: Propagate the trace context into the job message ***
      const activeContext = context.active();
      const headers = {};
      propagation.inject(activeContext, headers);
      jobOptions.headers = headers;

      await queue.add(jobName, { companyId, employeeData }, jobOptions);

      span.setAttributes({
        'messaging.system': 'bullmq',
        'messaging.destination': 'employee-sync',
        'job.id': jobId,
        'job.company_id': companyId,
        'job.employee_dni': employeeData.dni,
      });

      span.end();
    });

    console.log(`[Queue] Successfully added job ${jobId} for company ${companyId}`);

  } catch (error) {
    console.error(`[Queue] Failed to add employee sync job for company ${companyId}`, error);
  }
};
