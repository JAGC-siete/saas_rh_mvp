const session = require('express-session');
const RedisStore = require('connect-redis').default;
const Redis = require('redis');
const crypto = require('crypto');

const redisClient = Redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  password: process.env.REDIS_PASSWORD || 'redis_secret'
});

redisClient.on('error', (err) => console.error('Redis Client Error:', err));
redisClient.on('connect', () => console.log('Connected to Redis'));

redisClient.connect().catch(console.error);

const sessionConfig = {
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
  name: 'sessionId',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 60,
    sameSite: 'strict'
  },
  rolling: true
};

// Add security headers middleware with specific CSP for attendance service
const securityHeaders = (req, res, next) => {
  // Content Security Policy for attendance service
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

module.exports = {
  sessionMiddleware: session(sessionConfig),
  securityHeaders,
  redisClient
};
