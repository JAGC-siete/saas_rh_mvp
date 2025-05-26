import dotenv from 'dotenv';
import { createClient } from 'redis';

// Load environment variables
dotenv.config();

// Create Redis client
const redisClient = createClient({
  url: 'redis://redis:6379',
  password: 'redis_secret'
});

// Redis connection test
async function testRedisConnection() {
  try {
    console.log('Redis configuration:', {
      host: process.env.REDIS_HOST || 'redis',
      port: process.env.REDIS_PORT || '6379',
    });

    await redisClient.connect();
    console.log('Redis connection status:', redisClient.isReady ? 'CONNECTED' : 'DISCONNECTED');

    // Test basic set/get operations
    await redisClient.set('test_key', 'test_value');
    const value = await redisClient.get('test_key');
    console.log('Redis SET/GET test:', value === 'test_value' ? 'SUCCESS' : 'FAILED');

    await redisClient.quit();
    return true;
  } catch (error) {
    console.error('Redis connection test failed:', error);
    await redisClient.quit();
    return false;
  }
}

// Run the test
testRedisConnection()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
