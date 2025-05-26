import express from 'express';
import pg from 'pg';
const { Pool } = pg;
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
dotenv.config();

// Security packages
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';
import xssClean from 'xss-clean';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import expressRequestId from 'express-request-id';

// Custom modules
import logger from './logger.js';
import { sessionMiddleware, securityHeaders, redisClient } from './session.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Initialize middleware
const initializeApp = async () => {
  // Add request ID to each request
  app.use(expressRequestId());

  // Logging middleware
  app.use(logger.requestLogger);

  // Security middleware
  app.use(helmet());
  app.use(securityHeaders);
  app.use(cors({
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 600
  }));

  // Session middleware
  app.use(sessionMiddleware);

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again later.'
  });
  app.use(limiter);

  // Body parsing with limits
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));

  // Data sanitization
  app.use(xssClean());
  app.use(mongoSanitize());
  app.use(hpp());

  // Database table constants
  const EMPLOYEES_TABLE = 'employees';
  const ATTENDANCE_TABLE = 'asistencia';
  const PAYROLL_TABLE = 'payroll';

  // Database configuration
  const pool = new Pool({
    user: process.env.DB_USER || 'admin',
    host: process.env.DB_HOST || 'postgres',
    database: process.env.DB_NAME || 'saas_db',
    password: process.env.DB_PASSWORD || 'secret',
    port: process.env.DB_PORT || 5432,
    // Add connection timeout and retry settings
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    max: 20 // Maximum number of clients in the pool
  });

  // Health check endpoint
  app.get('/health', async (req, res) => {
    try {
      await pool.query('SELECT 1');
      if (redisClient) {
        await redisClient.ping();
      }
      res.status(200).json({ status: 'healthy', service: 'asistencia' });
    } catch (error) {
      logger.error('Health check failed:', error);
      res.status(503).json({ status: 'unhealthy', error: error.message });
    }
  });

  // Start the server
  const PORT = process.env.PORT || 3003;
  app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
  });
};

// Initialize the application
initializeApp().catch(err => {
  console.error('Failed to initialize application:', err);
  process.exit(1);
});
