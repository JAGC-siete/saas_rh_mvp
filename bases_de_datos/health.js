// Health check endpoint implementation
import { createClient } from 'redis';
import pg from 'pg';
const { Pool } = pg;

const healthCheck = {
  // Database connection check
  async checkDatabase(pool) {
    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  },

  // Redis connection check - simplified implementation
  async checkRedis(redisClient) {
    try {
      if (redisClient && redisClient.isReady) {
        await redisClient.ping();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Redis health check failed:', error);
      return false;
    }
  },

  // Combined health check
  createHealthCheckMiddleware(pool, redisClient) {
    return async (req, res) => {
      try {
        const dbHealth = await this.checkDatabase(pool);
        const redisHealth = await this.checkRedis(redisClient);
        
        const health = {
          status: dbHealth && redisHealth ? 'healthy' : 'unhealthy',
          timestamp: new Date().toISOString(),
          services: {
            database: dbHealth ? 'connected' : 'disconnected',
            redis: redisHealth ? 'connected' : 'disconnected'
          }
        };

        res.status(health.status === 'healthy' ? 200 : 503).json(health);
      } catch (error) {
        res.status(503).json({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: error.message
        });
      }
    };
  }
};

export default healthCheck;
