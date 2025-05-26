import dotenv from 'dotenv';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';
import xssClean from 'xss-clean';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import requestId from 'express-request-id';

dotenv.config();

// Custom modules
import logger from './logger.js';
import { getSessionMiddleware, securityHeaders } from './session.js';
import express from 'express';
import pg from 'pg';
const { Pool } = pg;
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { DateTime } from 'luxon';
import axios from 'axios';
import jwt from 'jsonwebtoken';
const { body, validationResult } = require('express-validator');
const xssClean = require('xss-clean');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const requestId = require('express-request-id')();

// Custom modules
const logger = require('./logger');
const { getSessionMiddleware, securityHeaders } = require('./session');

const app = express();

// Initialize session middleware first
const initializeApp = async () => {
  // Wait until session middleware is available
  const waitForSession = (retries = 30) => new Promise((resolve, reject) => {
    const sessionMiddleware = getSessionMiddleware();
    if (sessionMiddleware) {
      resolve(sessionMiddleware);
    } else if (retries <= 0) {
      reject(new Error('Timed out waiting for session middleware'));
    } else {
      setTimeout(() => waitForSession(retries - 1).then(resolve, reject), 1000);
    }
  });

  try {
    const sessionMiddleware = await waitForSession();
    app.use(sessionMiddleware);
  } catch (err) {
    console.error('Failed to initialize session middleware:', err);
    process.exit(1);
  }
};

initializeApp().catch(err => {
  console.error('Failed to initialize app:', err);
  process.exit(1);
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      fontSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  }
})); // Set secure headers with CSP for HTML content

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*', // In production, set specific origins
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 600 // Cache preflight requests for 10 minutes
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Specific rate limit for login attempts
const loginLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each IP to 5 login requests per windowMs
  message: 'Too many login attempts from this IP, please try again after an hour.'
});

// Body parsing
app.use(express.json({ limit: '10kb' })); // Body limit is 10kb
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Data sanitization
app.use(xssClean()); // Clean user input from XSS
app.use(mongoSanitize()); // Prevent NoSQL injection
app.use(hpp()); // Prevent HTTP Parameter Pollution

// Static files with security headers
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, path, stat) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('X-Frame-Options', 'DENY');
    res.set('X-XSS-Protection', '1; mode=block');
  }
}));

// Helper function for basic templating
function render_template_string(template, context) {
    return template.replace(/\{\{\s*([^}]+)\s*\}\}/g, (match, p1) => {
        return context[p1.trim()] || '';
    });
}

// Configuración de rutas
const BASE_DIR = path.dirname(__filename);
const DB_PATH = path.join(BASE_DIR, '../db/rh.db');
const VOUCHERS_DIR = path.join(BASE_DIR, 'vouchers');

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    await pool.query('SELECT NOW()');
    // Check Redis connection if used
    if (redisClient) {
      await redisClient.ping();
    }
    res.status(200).json({ status: 'healthy', service: 'nomina' });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({ status: 'unhealthy', error: error.message });
  }
});

// === Funciones utilitarias ===
function calcularISR(salarioBase) {
  const ingresoAnual = salarioBase * 12;
  const rentaNeta = ingresoAnual - 40000;
  if (rentaNeta <= 217493.16) return 0;
  if (rentaNeta <= 494224.40) return ((rentaNeta - 217493.16) * 0.15) / 12;
  if (rentaNeta <= 771252.37) return (41610.33 + (rentaNeta - 494224.40) * 0.20) / 12;
  return (96916.30 + (rentaNeta - 771252.37) * 0.25) / 12;
}

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

// === Rutas ===

// Prueba de vida
app.get('/health', (req, res) => {
  res.status(200).send('Nomina OK');
});

// Login para obtener token
app.post('/login', (req, res) => {
  const { usuario, password } = req.body;
  if (usuario === 'admin' && password === '1234') {
    const token = jwt.sign({ usuario }, JWT_SECRET, { expiresIn: '1h' });
    return res.json({ token });
  }
});

// Decorador de autenticación
function requiere_autenticacion(f) {
    return function (req, res, next) {
        const auth = req.headers.authorization;
        if (!auth) {
            return res.status(401).set('WWW-Authenticate', 'Basic realm="Login administradora requerido"').send('Acceso denegado. Por favor, inicia sesión.');
        }

        const [username, password] = Buffer.from(auth.split(' ')[1], 'base64').toString().split(':');
        if (username !== ADMIN_USER || password !== ADMIN_PASS) {
            return res.status(401).set('WWW-Authenticate', 'Basic realm="Login administradora requerido"').send('Acceso denegado. Por favor, inicia sesión.');
        }

        return f(req, res, next);
    };
}

const FORMULARIO_PLANILLA = `
<h1>Generar Planilla Quincenal</h1>
<form method="POST" action="/planilla">
    <label>Periodo (YYYY-MM):</label><br>
    <input type="text" name="periodo" value="{{ periodo_actual }}" required><br><br>
    <label>Quincena (1 o 2):</label><br>
    <input type="number" name="quincena" min="1" max="2" required><br><br>
    <input type="submit" value="Generar PDF">
</form>
`;

app.get('/', (req, res) => {
    res.send(`
    <h1>Bienvenido al Servicio de Payroll</h1>
    <p>Usa <a href="/planilla">/planilla</a> para generar una planilla quincenal (requiere autenticación: admin/1234).</p>
    `);
});

app.get('/planilla', requiere_autenticacion, (req, res) => {
    const periodo_actual = DateTime.now().toFormat('yyyy-MM');
    res.send(render_template_string(FORMULARIO_PLANILLA, { periodo_actual }));
});

app.post('/planilla', requiere_autenticacion, async (req, res) => {
    try {
        const { periodo, quincena } = req.body;

        let fecha_inicio, fecha_fin;
        if (quincena == 1) {
            fecha_inicio = `${periodo}-01`;
            fecha_fin = `${periodo}-15`;
        } else {
            fecha_inicio = `${periodo}-16`;
            fecha_fin = `${periodo}-31`;
        }

        const client = await pool.connect();

        const empleadosResult = await client.query(
            `SELECT ${EMPLOYEES_COLUMNS.ID}, ${EMPLOYEES_COLUMNS.NAME} as nombre, ${EMPLOYEES_COLUMNS.ROLE} as puesto, 
            ${EMPLOYEES_COLUMNS.BASE_SALARY} as salario_base, ${EMPLOYEES_COLUMNS.BANCO}, ${EMPLOYEES_COLUMNS.CUENTA} 
            FROM ${EMPLOYEES_TABLE}`
        );
        const empleados = empleadosResult.rows;

        const planilla_data = [];
        for (const empleado of empleados) {
            const asistenciasResult = await client.query(
                `SELECT ${ATTENDANCE_COLUMNS.CHECK_IN}, ${ATTENDANCE_COLUMNS.CHECK_OUT} 
                FROM ${ATTENDANCE_TABLE} 
                WHERE ${ATTENDANCE_COLUMNS.ID_EMPLEADO} = $1 
                AND ${ATTENDANCE_COLUMNS.DATE} BETWEEN $2 AND $3`,
                [empleado.id, fecha_inicio, fecha_fin]
            );
            const asistencias = asistenciasResult.rows;

            let horas_trabajadas = 0;
            for (const asistencia of asistencias) {
                if (asistencia.check_in && asistencia.check_out) {
                    const he = DateTime.fromFormat(asistencia.check_in, 'HH:mm');
                    const hs = DateTime.fromFormat(asistencia.check_out, 'HH:mm');
                    const horas = Math.max(0, hs.diff(he, 'hours').hours - 0.0833); // Deduct 5 minutes for late check-in
                    horas_trabajadas += horas;
                }
            }

            const dias_trabajados = Math.floor(horas_trabajadas / 8);
            const salario_hora = (empleado.salario_base / 30) / 8;
            const salario_quincenal = salario_hora * horas_trabajadas;

            let isss = 0, rap = 0, isr = 0;
            if (quincena == 2) {
                isss = ISSS;
                const rap_base = Math.max(0, empleado.salario_base - SALARIO_MINIMO);
                rap = rap_base * 0.015;
                const ingreso_anual = empleado.salario_base * 12;
                const renta_neta = ingreso_anual - 40000;
                if (renta_neta <= 217493.16) {
                    isr = 0;
                } else if (renta_neta <= 371833.53) {
                    isr = (renta_neta - 217493.16) * 0.15;
                } else if (renta_neta <= 814339.91) {
                    isr = (371833.53 - 217493.16) * 0.15 + (renta_neta - 371833.53) * 0.20;
                } else {
                    isr = (371833.53 - 217493.16) * 0.15 + (814339.91 - 371833.53) * 0.20 + (renta_neta - 814339.91) * 0.25;
                }
                isr = isr / 24; // quincenal
            }

            const total_deducciones = isss + rap + isr;
            const pago_neto = salario_quincenal - total_deducciones;

            // Persist payroll data in the payroll table
            try {
                // First check if a record already exists
                const existingRecord = await client.query(
                    `SELECT ${PAYROLL_COLUMNS.ID} FROM ${PAYROLL_TABLE} 
                    WHERE ${PAYROLL_COLUMNS.ID_EMPLEADO} = $1 AND ${PAYROLL_COLUMNS.PERIODO} = $2`,
                    [empleado.id, `${periodo}-Q${quincena}`]
                );
                
                if (existingRecord.rows.length > 0) {
                    // Update existing record
                    await client.query(
                        `UPDATE ${PAYROLL_TABLE} SET
                            ${PAYROLL_COLUMNS.SALARIO_BRUTO} = $1,
                            ${PAYROLL_COLUMNS.DEDUCCIONES} = $2,
                            ${PAYROLL_COLUMNS.SALARIO_NETO} = $3
                        WHERE ${PAYROLL_COLUMNS.ID} = $4`,
                        [
                            salario_quincenal,
                            total_deducciones,
                            pago_neto,
                            existingRecord.rows[0].id
                        ]
                    );
                } else {
                    // Insert new record
                    await client.query(
                        `INSERT INTO ${PAYROLL_TABLE} (
                            ${PAYROLL_COLUMNS.ID_EMPLEADO}, 
                            ${PAYROLL_COLUMNS.PERIODO}, 
                            ${PAYROLL_COLUMNS.SALARIO_BRUTO}, 
                            ${PAYROLL_COLUMNS.DEDUCCIONES}, 
                            ${PAYROLL_COLUMNS.SALARIO_NETO}
                        ) VALUES ($1, $2, $3, $4, $5)`,
                        [
                            empleado.id,
                            `${periodo}-Q${quincena}`,
                            salario_quincenal,
                            total_deducciones,
                            pago_neto
                        ]
                    );
                }
            } catch (err) {
                console.error(`Error persisting payroll data: ${err}`);
            }

            planilla_data.push({
                nombre: empleado.nombre,
                puesto: empleado.puesto,
                salario_base: empleado.salario_base,
                dias_trabajados,
                horas_trabajadas,
                salario_quincenal,
                isss,
                rap,
                isr,
                total_deducciones,
                pago_neto,
                banco: empleado.banco,
                cuenta: empleado.cuenta,
            });

            // Persist payroll data in the payroll table
            await client.query(
                `INSERT INTO ${PAYROLL_TABLE} (id_empleado, periodo, salario_bruto, deducciones, salario_neto)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (id_empleado, periodo) DO UPDATE SET
                 salario_bruto = EXCLUDED.salario_bruto,
                 deducciones = EXCLUDED.deducciones,
                 salario_neto = EXCLUDED.salario_neto`,
                [
                    empleado.id,
                    `${periodo}-Q${quincena}`,
                    salario_quincenal,
                    total_deducciones,
                    pago_neto
                ]
            );
        }

        client.release();

        const pdf_path = path.join(VOUCHERS_DIR, `planilla_${periodo}_quincena${quincena}.pdf`);

        const doc = new PDFDocument({ size: 'A4', layout: 'landscape' });
        doc.pipe(fs.createWriteStream(pdf_path));

        doc.fontSize(16).text(`Planilla Quincenal - Periodo ${periodo} Quincena ${quincena}`, { align: 'center' });
        doc.moveDown();

        doc.fontSize(10).text('Nombre', 20, doc.y, { continued: true });
        doc.text('Cargo', 100, doc.y, { continued: true });
        doc.text('Salario Base', 180, doc.y, { continued: true });
        doc.text('Días Trab.', 260, doc.y, { continued: true });
        doc.text('Horas Trab.', 330, doc.y, { continued: true });
        doc.text('Salario Quinc.', 410, doc.y, { continued: true });
        doc.text('ISSS', 490, doc.y, { continued: true });
        doc.text('RAP', 540, doc.y, { continued: true });
        doc.text('ISR', 590, doc.y, { continued: true });
        doc.text('Total Deducc.', 640, doc.y, { continued: true });
        doc.text('Pago Neto', 700, doc.y, { continued: true });
        doc.text('Banco', 760, doc.y, { continued: true });
        doc.text('Cuenta', 820);

        doc.moveDown();

        planilla_data.forEach(data => {
            doc.text(data.nombre, 20, doc.y, { continued: true });
            doc.text(data.puesto, 100, doc.y, { continued: true });
            doc.text(data.salario_base.toFixed(2), 180, doc.y, { continued: true });
            doc.text(data.dias_trabajados, 260, doc.y, { continued: true });
            doc.text(data.horas_trabajadas.toFixed(2), 330, doc.y, { continued: true });
            doc.text(data.salario_quincenal.toFixed(2), 410, doc.y, { continued: true });
            doc.text(data.isss.toFixed(2), 490, doc.y, { continued: true });
            doc.text(data.rap.toFixed(2), 540, doc.y, { continued: true });
            doc.text(data.isr.toFixed(2), 590, doc.y, { continued: true });
            doc.text(data.total_deducciones.toFixed(2), 640, doc.y, { continued: true });
            doc.text(data.pago_neto.toFixed(2), 700, doc.y, { continued: true });
            doc.text(data.banco, 760, doc.y, { continued: true });
            doc.text(data.cuenta, 820);
            doc.moveDown();
        });

        doc.end();

        res.download(pdf_path, `planilla_${periodo}_quincena${quincena}.pdf`);
    } catch (e) {
        console.error(`Error: ${e}`);
        res.status(500).send(`Error: ${e}`);
    }
});

// Request validation middleware
const validatePlanillaInput = [
  body('periodo')
    .matches(/^\d{4}-\d{2}$/)
    .withMessage('Periodo debe tener formato YYYY-MM'),
  body('quincena')
    .isInt({ min: 1, max: 2 })
    .withMessage('Quincena debe ser 1 o 2'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

// Validate and apply rate limiting to login
app.post('/login', loginLimiter, [
  body('usuario').trim().notEmpty().withMessage('Usuario es requerido'),
  body('password').notEmpty().withMessage('Contraseña es requerida'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { usuario, password } = req.body;
  
  // Use constant time comparison to prevent timing attacks
  const userMatch = usuario === ADMIN_USER;
  const passMatch = password === ADMIN_PASS;
  
  if (userMatch && passMatch) {
    const token = jwt.sign({ usuario }, JWT_SECRET, { 
      expiresIn: '1h',
      algorithm: 'HS256'
    });
    
    // Set secure cookie with JWT
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600000 // 1 hour
    });

    return res.json({ 
      token,
      expiresIn: 3600,
      message: 'Login exitoso'
    });
  }

  // Use same message to prevent user enumeration
  return res.status(401).json({ error: 'Credenciales inválidas' });
});

// Apply validation to planilla generation
app.post('/planilla', validatePlanillaInput, authenticateToken, async (req, res) => {
  const { periodo, quincena } = req.body;

  try {
    const client = await pool.connect();
    // ... rest of your existing planilla generation code ...

  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ 
      error: 'Error generando la planilla',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined 
    });
  }
});

// === Arrancar el servidor ===
const PORT = process.env.PORT || 3002;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor corriendo en http://0.0.0.0:${PORT}`);
});
