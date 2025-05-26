import session from 'express-session';
import { createClient } from 'redis';
import { RedisStore } from 'connect-redis';

const redisHost = process.env.REDIS_HOST || 'redis';
const redisPortStr = process.env.REDIS_PORT || '6379';
const redisPort = parseInt(redisPortStr, 10);

if (isNaN(redisPort)) {
  console.error('Invalid REDIS_PORT value:', redisPortStr);
  process.exit(1);
}

const redisClient = createClient({
  socket: {
    host: redisHost,
    port: redisPort
  },
  password: process.env.REDIS_PASSWORD,
  retry_strategy: function(options) {
    if (options.error && options.error.code === 'ECONNREFUSED') {
      console.warn('Connection to Redis refused. Retrying...');
      return Math.min(options.attempt * 100, 3000);
    }
    if (options.total_retry_time > 1000 * 60 * 60) {
      console.error('Redis retry time exhausted');
      return new Error('Redis retry time exhausted');
    }
    return Math.min(options.attempt * 100, 3000);
  }
});

redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
  console.log('Connected to Redis successfully');
});

const store = new RedisStore({
  client: redisClient,
  prefix: 'sess:',
});

const sessionMiddleware = session({
  store,
  secret: process.env.SESSION_SECRET || 'mi_secreto_supersecreto',
  name: 'sid',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: parseInt(process.env.COOKIE_MAX_AGE) || 24 * 60 * 60 * 1000 // 24 hours
  }
});

// Add security headers middleware
const securityHeaders = (req, res, next) => {
  // Content Security Policy for data service
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "block-all-mixed-content",
    "upgrade-insecure-requests"
  ].join('; '));

  // Other security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
};

async function initializeRedis() {
  try {
    await redisClient.connect();
    console.log('Redis client connected successfully');
  } catch (err) {
    console.error('Failed to connect to Redis:', err);
    process.exit(1);
  }
}

export { sessionMiddleware, redisClient, initializeRedis, securityHeaders };