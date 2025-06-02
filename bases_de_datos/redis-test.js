import dotenv from 'dotenv';
import { createClient } from 'redis';
import chalk from 'chalk';

// Load environment variables
dotenv.config();

async function testRedisConnection() {
  console.log(chalk.yellow('\nTesting Redis connection...\n'));
  
  const redisHost = process.env.REDIS_HOST || 'redis';
  const redisPort = process.env.REDIS_PORT || '6379';
  
  console.log('Redis configuration:');
  console.log('------------------');
  console.log(chalk.blue('Host:'), redisHost);
  console.log(chalk.blue('Port:'), redisPort);
  console.log('');

  const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://redis:6379',
    password: process.env.REDIS_PASSWORD
  });

  redisClient.on('error', (err) => console.error('Redis Client Error:', err));

  try {
    // Connect to Redis
    await redisClient.connect();
    console.log(chalk.green('✓ Successfully connected to Redis'));

    // Test SET operation
    await redisClient.set('test_key', 'test_value');
    console.log(chalk.green('✓ SET operation successful'));

    // Test GET operation
    const value = await redisClient.get('test_key');
    if (value === 'test_value') {
      console.log(chalk.green('✓ GET operation successful'));
    } else {
      throw new Error('GET operation failed - value mismatch');
    }

    // Clean up test key
    await redisClient.del('test_key');
    console.log(chalk.green('✓ Cleanup successful'));

    // Test PING
    const pingResponse = await redisClient.ping();
    if (pingResponse === 'PONG') {
      console.log(chalk.green('✓ PING test successful'));
    } else {
      throw new Error('PING test failed');
    }

    await redisClient.quit();
    console.log(chalk.green('\n✅ All Redis tests passed!\n'));
    process.exit(0);
  } catch (error) {
    console.error(chalk.red('\n❌ Redis test failed:'), error);
    try {
      await redisClient.quit();
    } catch (e) {
      // Ignore cleanup errors
    }
    process.exit(1);
  }
}

// Run the test
testRedisConnection();
