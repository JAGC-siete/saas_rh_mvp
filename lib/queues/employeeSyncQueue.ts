import { Queue } from 'bullmq';
// Use CommonJS require to bypass ES module resolution issues with ioredis
const Redis = require('ioredis');
import { trace, context, propagation } from '@opentelemetry/api';

// Ensure we only have one instance of Redis and Queue
let redis: any; // Use 'any' type for simplicity with require syntax
let employeeSyncQueue: Queue | undefined;

const getRedisInstance = () => {
  if (!redis) {
    if (process.env.REDIS_URL) {
      redis = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: null });
    } else {
      redis = new Redis({ host: 'localhost', port: 6379, maxRetriesPerRequest: null });
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
