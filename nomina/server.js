import 'dotenv/config';
import express from 'express';
import pool from './src/infrastructure/db.js';
import PostgresEmployeeRepository from './src/infrastructure/PostgresEmployeeRepository.js';
import PostgresAttendanceRepository from './src/infrastructure/PostgresAttendanceRepository.js';
import Redis from 'ioredis';
import PayrollService from './src/application/PayrollService.js';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

const app = express();

const employeeRepo = new PostgresEmployeeRepository(pool);
const attendanceRepo = new PostgresAttendanceRepository(pool);
const payrollService = new PayrollService(employeeRepo, attendanceRepo);

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Update CORS configuration to use environment variable
const corsOrigin = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000'];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (corsOrigin.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  }
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const [dbResponse, redisHealth] = await Promise.allSettled([
      axios.get(process.env.BASES_DE_DATOS_URL + '/health'),
      redisClient.ping()
    ]);

    const redisStatus = redisHealth.status === 'fulfilled' && redisHealth.value === 'PONG';
    const dbStatus = dbResponse.status === 'fulfilled' && dbResponse.value.data.status === 'healthy';

    const health = {
      status: dbStatus && redisStatus ? 'healthy' : 'unhealthy',
      service: 'nomina',
      timestamp: new Date().toISOString(),
      dependencies: {
        basesDeDatos: {
          status: dbStatus ? 'healthy' : 'unhealthy',
          details: dbResponse.status === 'fulfilled' ? dbResponse.value.data : dbResponse.reason.message
        },
        redis: {
          status: redisStatus ? 'healthy' : 'unhealthy',
          details: redisHealth.status === 'fulfilled' ? 'Connected' : redisHealth.reason.message
        }
      }
    };

    res.status(health.status === 'healthy' ? 200 : 503).json(health);
  } catch (error) {
    res.status(503).json({ 
      status: 'unhealthy',
      service: 'nomina',
      timestamp: new Date().toISOString(),
      error: error.message,
      details: {
        basesDeDatosConnection: error.code === 'ECONNREFUSED' ? 'failed' : 'error',
        redisConnection: 'failed'
      }
    });
  }
});


function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token inválido o expirado' });
    req.user = user;
    next();
  });
}

    return res.json({ token });
  }
  return res.status(401).json({ error: 'Credenciales inválidas' });
});

app.post('/planilla', authenticateToken, async (req, res) => {
  const { periodo, quincena } = req.body;
  if (!/^\d{4}-\d{2}$/.test(periodo)) return res.status(400).json({ error: 'Periodo inválido (YYYY-MM)' });
  const q = parseInt(quincena);
  if (![1, 2].includes(q)) return res.status(400).json({ error: 'Quincena inválida' });

  try {
    const pdf = await payrollService.generatePayroll(periodo, q);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=planilla_${periodo}_q${q}.pdf`);
    res.send(pdf);
  } catch (err) {
    console.error('💥 Error:', err.message);
    res.status(500).json({ error: 'Error generando la planilla' });
  }
});

// Mejorar el logging
function logInfo(message, ...args) {
  console.log(`[${new Date().toISOString()}] INFO: ${message}`, ...args);
}

function logError(message, error) {
  console.error(`[${new Date().toISOString()}] ERROR: ${message}`, error);
}

// Inicialización del servidor
const port = process.env.PORT || 3002;
app.listen(port, '0.0.0.0', () => {
  logInfo(`Servidor de nómina escuchando en puerto ${port}`);
  logInfo('Configuración:', {
    JWT_SECRET: JWT_SECRET ? 'Configurado' : 'No configurado',
    STATIC_PATH: path.join(__dirname, 'public'),
    NODE_ENV: process.env.NODE_ENV
  });
});

// Manejo de errores no capturados
process.on('unhandledRejection', (reason, promise) => {
  logError('Unhandled Rejection at:', reason);
});

process.on('uncaughtException', (error) => {
  logError('Uncaught Exception:', error);
  // Dar tiempo para logging y limpieza
  setTimeout(() => process.exit(1), 1000);
});
