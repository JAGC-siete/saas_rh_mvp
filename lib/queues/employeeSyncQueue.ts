import { Queue } from 'bullmq';
import * as Redis from 'ioredis'; // Reverting to namespace import
import { trace, context, propagation } from '@opentelemetry/api';

// Ensure we only have one instance of Redis and Queue
let redis: Redis.Redis | undefined;
let employeeSyncQueue: Queue | undefined;

const getRedisInstance = () => {
  if (!redis) {
    if (process.env.REDIS_URL) {
      redis = new Redis.default(process.env.REDIS_URL, { maxRetriesPerRequest: null });
    } else {
      redis = new Redis.default({ host: 'localhost', port: 6379, maxRetriesPerRequest: null });
    }
  }
  return redis;
};

const getQueueInstance = () => {
  if (!employeeSyncQueue) {
    employeeSyncQueue = new Queue('employee-sync', {
      connection: getRedisInstance(),
    });
  }
  return employeeSyncQueue;
};

export const addEmployeeSyncJob = (employeeId: string) => {
  const activeContext = context.active();
  const traceData = {};
  propagation.inject(activeContext, traceData);

  getQueueInstance().add('sync-employee', {
    employeeId,
    traceData,
  });
};
