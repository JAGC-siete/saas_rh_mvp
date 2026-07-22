// Employee sync queue - Optional feature that requires Redis
// If Redis is not available, this module gracefully degrades to a no-op
// The employee will still be created/updated in the database, but won't sync to Hikvision devices

import { getRedisUrl } from '../redis/url';

let isQueueAvailable = false;
let queueInitialized = false;

// Lazy initialization check - only check once
const checkQueueAvailability = (): boolean => {
  if (queueInitialized) {
    return isQueueAvailable;
  }
  
  queueInitialized = true;
  
  const redisUrl = getRedisUrl();
  // Only enable queue if Redis URL is explicitly set (prefer REDIS_PRIVATE_URL)
  if (redisUrl) {
    try {
      // Try to require BullMQ and Redis only if Redis URL is present
      const { Queue } = require('bullmq');
      const Redis = require('ioredis');
      
      // Test if we can create a Redis connection (lazy connect)
      const testRedis = new Redis(redisUrl, {
        maxRetriesPerRequest: null,
        lazyConnect: true,
        retryStrategy: () => null,
      });
      
      // If we get here, Redis is available
      isQueueAvailable = true;
      console.log('[Queue] Employee sync queue enabled (Redis available)');
      return true;
    } catch (error) {
      console.warn('[Queue] Redis URL set but connection failed, queue disabled:', error instanceof Error ? error.message : String(error));
      isQueueAvailable = false;
      return false;
    }
  } else {
    // No Redis URL = queue feature disabled (this is fine, it's optional)
    console.log('[Queue] Employee sync queue disabled (REDIS_URL / REDIS_PRIVATE_URL not set)');
    isQueueAvailable = false;
    return false;
  }
};

// Lazy-loaded queue instance
let employeeSyncQueue: any = null;

const getQueueInstance = () => {
  if (!checkQueueAvailability()) {
    return null;
  }
  
  if (!employeeSyncQueue) {
    try {
      const { Queue } = require('bullmq');
      const Redis = require('ioredis');
      
      const redisUrl = getRedisUrl();
      if (!redisUrl) {
        return null;
      }

      const redis = new Redis(redisUrl, {
        maxRetriesPerRequest: null,
        lazyConnect: true,
        retryStrategy: () => null,
      });
      
      employeeSyncQueue = new Queue('employee-sync', {
        connection: redis,
      });
    } catch (error) {
      console.error('[Queue] Failed to create queue instance:', error);
      isQueueAvailable = false;
      return null;
    }
  }
  
  return employeeSyncQueue;
};

/**
 * Adds an employee sync job to the queue (if Redis is available).
 * This is an optional feature - if Redis is not available, this is a no-op.
 * The employee will still be created/updated in the database.
 * 
 * @param employeeId - The ID of the employee to sync to Hikvision devices
 */
export const addEmployeeSyncJob = (employeeId: string): void => {
  // Silently skip if queue is not available - this is expected behavior
  if (!checkQueueAvailability()) {
    return;
  }
  
  try {
    const queue = getQueueInstance();
    if (!queue) {
      return;
    }
    
    // Try to get OpenTelemetry context if available (optional)
    let traceData = {};
    try {
      const { context, propagation } = require('@opentelemetry/api');
      const activeContext = context.active();
      if (activeContext) {
        propagation.inject(activeContext, traceData);
      }
    } catch {
      // OpenTelemetry not available - that's fine, continue without tracing
    }
    
    queue.add('sync-employee', {
      employeeId,
      traceData,
    }).catch((error: Error) => {
      // Log but don't throw - queue failures shouldn't break employee creation
      console.warn(`[Queue] Failed to add sync job for employee ${employeeId}:`, error.message);
    });
  } catch (error) {
    // Silently handle errors - queue is optional
    console.warn(`[Queue] Error adding sync job for employee ${employeeId}:`, error instanceof Error ? error.message : String(error));
  }
};
