import session from 'express-session';
import { createClient } from 'redis';
import RedisStore from 'connect-redis';

// Initialize client.
const redisClient = createClient({ 
  url: process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || 'redis'}:${process.env.REDIS_PORT || '6379'}`,
  password: process.env.REDIS_PASSWORD
});

redisClient.connect().catch(console.error);

redisClient.on('error', err => console.error('Redis Client Error:', err));
redisClient.on('connect', () => console.log('Connected to Redis'));
redisClient.on('ready', () => console.log('Redis Client Ready'));

// Initialize store.
const store = new RedisStore({ 
  client: redisClient,
  prefix: "sess:"
});

export const sessionMiddleware = session({
  store,
  secret: process.env.SESSION_SECRET || 'super-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 // 24 hours
  }
});

export const securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
};

export { redisClient };