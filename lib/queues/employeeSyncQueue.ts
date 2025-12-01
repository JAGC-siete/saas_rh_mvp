import { Queue } from 'bullmq';
// Use CommonJS require to bypass ES module resolution issues with ioredis
const Redis = require('ioredis');
import { trace, context, propagation } from '@opentelemetry/api';

// Ensure we only have one instance of Redis and Queue
let redis: any; // Use 'any' type for simplicity with require syntax
let employeeSyncQueue: Queue | undefined;

const getRedisInstance = () => {
  if (!redis) {
    try {
      if (process.env.REDIS_URL) {
        redis = new Redis(process.env.REDIS_URL, { 
          maxRetriesPerRequest: null,
          lazyConnect: true, // Don't connect immediately
          retryStrategy: () => null, // Don't retry if connection fails
        });
      } else {
        // In production without REDIS_URL, don't create Redis connection
        // This prevents crashes if Redis is not available
        console.warn('[Queue] REDIS_URL not set, queue operations will be disabled');
        return null;
      }
    } catch (error) {
      console.error('[Queue] Failed to create Redis instance:', error);
      return null;
    }
  }
  return redis;
};

const getQueueInstance = () => {
  if (!employeeSyncQueue) {
    const redisInstance = getRedisInstance();
    if (!redisInstance) {
      return null;
    }
    try {
      employeeSyncQueue = new Queue('employee-sync', {
        connection: redisInstance,
      });
    } catch (error) {
      console.error('[Queue] Failed to create queue instance:', error);
      return null;
    }
  }
  return employeeSyncQueue;
};

export const addEmployeeSyncJob = (employeeId: string) => {
  try {
    const redisInstance = getRedisInstance();
    if (!redisInstance) {
      console.warn('[Queue] Redis not available, skipping employee sync job');
      return;
    }

    const queueInstance = getQueueInstance();
    if (!queueInstance) {
      console.warn('[Queue] Queue not available, skipping employee sync job');
      return;
    }

    const activeContext = context.active();
    const traceData = {};
    propagation.inject(activeContext, traceData);

    queueInstance.add('sync-employee', {
      employeeId,
      traceData,
    });
  } catch (error) {
    console.error('[Queue] Failed to add employee sync job:', error);
    // Don't throw - allow the request to continue even if queue fails
  }
};
