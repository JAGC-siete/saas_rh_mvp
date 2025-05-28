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
  try {
    // Initialize session first
    app.use(sessionMiddleware);
    
    // Add request ID to each request
    app.use(expressRequestId());

    // Logging middleware
    app.use(logger.requestLogger);

    // Serve static files
    app.use(express.static(path.join(__dirname)));

    // Security middleware
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:"],
          connectSrc: ["'self'"],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"]
        }
      }
    }));
    app.use(securityHeaders);
    app.use(cors({
      origin: process.env.CORS_ORIGIN?.split(',') || '*',
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
      maxAge: 600
    }));

    // Session middleware (applied once)
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
        console.error('Health check failed:', error);
        res.status(503).json({ status: 'unhealthy', error: error.message });
      }
    });

    // Attendance routes
    app.post('/attendance', async (req, res) => {
      const { last5, justification } = req.body;
      const client = await pool.connect();

      try {
        const empleadoResult = await client.query(
          `SELECT * FROM ${EMPLOYEES_TABLE} WHERE RIGHT(dni, 5) = $1`,
          [last5]
        );

        if (empleadoResult.rows.length === 0) {
          return res.status(404).json({ message: 'Empleado no encontrado.' });
        }

        const empleado = empleadoResult.rows[0];
        const now = new Date();
        const horaActual = now.toLocaleTimeString('es-HN', { hour12: false });
        const fechaHoy = now.toISOString().split('T')[0];

        // Check if there's already an attendance record for today
        const existingRecord = await client.query(
          `SELECT * FROM ${ATTENDANCE_TABLE} WHERE employee_id = $1 AND date = $2`,
          [empleado.id, fechaHoy]
        );

        if (existingRecord.rows.length === 0) {
          // Register check-in
          await client.query(
            `INSERT INTO ${ATTENDANCE_TABLE} (employee_id, date, check_in, justification) VALUES ($1, $2, $3, $4)`,
            [empleado.id, fechaHoy, horaActual, justification]
          );
          return res.status(200).json({ message: '✅ Entrada registrada exitosamente.' });
        } 
        
        if (!existingRecord.rows[0].check_out) {
          // Register check-out
          await client.query(
            `UPDATE ${ATTENDANCE_TABLE} SET check_out = $1 WHERE employee_id = $2 AND date = $3`,
            [horaActual, empleado.id, fechaHoy]
          );
          return res.status(200).json({ message: '✅ Salida registrada exitosamente.' });
        }

        return res.status(200).json({ message: '📌 Ya registraste entrada y salida hoy.' });

      } catch (err) {
        console.error('❌ Error registrando asistencia:', err);
        return res.status(500).json({ message: 'Error interno del servidor.' });
      } finally {
        client.release();
      }
    });

    // Serve the attendance form
    app.get('/attendance', (req, res) => {
      res.sendFile(path.join(__dirname, 'asistencia.html'));
    });

    // Start the server
    const PORT = process.env.PORT || 3003;
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to initialize middleware:', error);
    throw error;
  }
};

// Initialize the application
initializeApp().catch(err => {
  console.error('Failed to initialize application:', err);
  process.exit(1);
});