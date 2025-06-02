import { createClient } from 'redis';

async function testRedisConnection() {
    const client = createClient({
        url: process.env.REDIS_URL || 'redis://redis:6379',
        password: process.env.REDIS_PASSWORD
    });

    client.on('error', err => console.error('Redis Client Error:', err));
    client.on('connect', () => console.log('Connected to Redis!'));

    try {
        await client.connect();
        await client.set('test_key', 'test_value');
        const value = await client.get('test_key');
        console.log('Retrieved value:', value);
        await client.quit();
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

testRedisConnection();
