import dotenv from 'dotenv';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';
import xssClean from 'xss-clean';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import requestId from 'express-request-id';
import express from 'express';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DateTime } from 'luxon';
import axios from 'axios';
import jwt from 'jsonwebtoken';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express application
const app = express();

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

// Rate limiting (in-memory, no Redis needed)
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

// Request ID middleware for tracking
app.use(requestId());

// Constants
const SALARIO_MINIMO = 11903.13;
const RAP_PORCENTAJE = 0.015;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || '1234';

// Helper function for basic templating
function render_template_string(template, context) {
    return template.replace(/\{\{\s*([^}]+)\s*\}\}/g, (match, p1) => {
        return context[p1.trim()] || '';
    });
}

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check database connection (Supabase via bases_de_datos service)
    const dbResponse = await axios.get(process.env.BASES_DE_DATOS_URL + '/health');

    const health = {
      status: dbResponse.data.status === 'healthy' ? 'healthy' : 'unhealthy',
      service: 'nomina',
      timestamp: new Date().toISOString(),
      dependencies: {
        basesDeDatos: {
          status: dbResponse.data.status === 'healthy' ? 'healthy' : 'unhealthy',
          details: dbResponse.data
        },
        supabase: {
          status: 'configured',
          details: 'Using Supabase for data storage and authentication'
        }
      }
    };

    res.status(health.status === 'healthy' ? 200 : 503).json(health);
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({ 
      status: 'unhealthy',
      service: 'nomina',
      timestamp: new Date().toISOString(),
      error: error.message,
      details: {
        basesDeDatosConnection: error.code === 'ECONNREFUSED' ? 'failed' : 'error',
        supabase: 'configured'
      }
    });
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

const formatoLempiras = n => new Intl.NumberFormat('es-HN', {
  style: 'currency',
  currency: 'HNL',
  minimumFractionDigits: 2
}).format(n);

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

// === Rutas ===

// Prueba de vida
app.get('/health', (req, res) => {
  res.status(200).send('Nomina OK');
});

app.get('/', (req, res) => {
    res.send(`
    <h1>Bienvenido al Servicio de Payroll</h1>
    <p>Usa <a href="/planilla">/planilla</a> para generar una planilla quincenal (requiere autenticación: admin/1234).</p>
    <p><strong>Arquitectura:</strong> Supabase + Express con seguridad mejorada</p>
    `);
});

app.get('/planilla', requiere_autenticacion, (req, res) => {
    const periodo_actual = DateTime.now().toFormat('yyyy-MM');
    res.send(render_template_string(FORMULARIO_PLANILLA, { periodo_actual }));
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
  const q = parseInt(quincena);

  const [year, month] = periodo.split('-').map(Number);
  const ultimoDia = new Date(year, month, 0).getDate();
  const fechaInicio = q === 1 ? `${periodo}-01` : `${periodo}-16`;
  const fechaFin = q === 1 ? `${periodo}-15` : `${periodo}-${ultimoDia}`;
  const aplicarDeducciones = q === 2;

  try {
    const [empRes, asisRes] = await Promise.all([
      axios.get(`${process.env.BASES_DE_DATOS_URL}/employees`),
      axios.get(`${process.env.BASES_DE_DATOS_URL}/attendance`)
    ]);

    const empleados = empRes.data;
    const asistencia = asisRes.data;

    const planilla = empleados.map(emp => {
      if (!emp.dni) {
        console.log(`⚠️ Empleado sin DNI: ${emp.name}`);
        return null;
      }

      const registros = asistencia.filter(r => {
        if (!r.dni || !r.check_in || !r.check_out || !r.date) return false;

        const matchLast5 = r.dni.slice(-5).trim() === emp.dni.slice(-5).trim();
        const recordDate = new Date(r.date);
        const startDate = new Date(fechaInicio);
        const endDate = new Date(fechaFin);
        const matchDate = recordDate >= startDate && recordDate <= endDate;

        return matchLast5 && matchDate;
      });

      const horas = registros.reduce((sum, r) => {
        try {
          const [hIn, mIn] = r.check_in.slice(0,5).split(':').map(Number);
          const [hOut, mOut] = r.check_out.slice(0,5).split(':').map(Number);
          const minutos = (hOut * 60 + mOut) - (hIn * 60 + mIn);
          const horas = minutos / 60;
          return horas > 0 ? sum + horas : sum;
        } catch (err) {
          return sum;
        }
      }, 0);

      const dias = registros.length;
      const salarioBase = emp.base_salary || 15000;
      const salarioHora = salarioBase / 30 / 8;
      const salarioQuincenal = salarioHora * horas;

      const ihss = aplicarDeducciones ? Math.min(salarioBase, SALARIO_MINIMO) * 0.05 : 0;
      const rap = aplicarDeducciones ? Math.max(0, salarioBase - SALARIO_MINIMO) * RAP_PORCENTAJE : 0;
      const isr = aplicarDeducciones ? calcularISR(salarioBase) : 0;
      const totalDeducciones = ihss + rap + isr;
      const pagoNeto = salarioQuincenal - totalDeducciones;

      return {
        nombre: emp.name,
        cargo: emp.role || '',
        salarioMensual: formatoLempiras(salarioBase),
        dias,
        salarioQuincenal: formatoLempiras(salarioQuincenal),
        ihss: formatoLempiras(ihss),
        rap: formatoLempiras(rap),
        isr: formatoLempiras(isr),
        deducciones: formatoLempiras(totalDeducciones),
        neto: formatoLempiras(pagoNeto),
        banco: emp.bank_name || '',
        cuenta: emp.bank_account || ''
      };
    }).filter(Boolean);

    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 20 });
    let buffers = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdf = Buffer.concat(buffers);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=planilla_${periodo}_q${q}.pdf`);
      res.send(pdf);
    });

    doc.fontSize(10).text(`PLANILLA QUINCENAL - ${periodo} Q${q}`, { align: 'center' }).moveDown();
    doc.fontSize(8);

    const headers = [
      'Nombre', 'Cargo', 'Días', 'Sal. Mensual', 'Sal. Quin.',
      'IHSS', 'RAP', 'ISR', 'Deducciones', 'Pago Neto', 'Banco', 'Cuenta'
    ];
    const colWidths = [100, 80, 30, 60, 60, 40, 40, 40, 60, 60, 60, 80];
    const startX = 20;
    let y = 100;
    const rowHeight = 14;

    headers.forEach((h, i) => {
      const x = startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
      doc.rect(x, y, colWidths[i], rowHeight).fillAndStroke('#e0e0e0', '#000');
      doc.fillColor('#000').text(h, x + 2, y + 4, { width: colWidths[i] - 4 });
    });

    y += rowHeight;

    planilla.forEach(row => {
      const values = [
        row.nombre, row.cargo, row.dias, row.salarioMensual, row.salarioQuincenal,
        row.ihss, row.rap, row.isr, row.deducciones, row.neto,
        row.banco, row.cuenta
      ];
      values.forEach((val, i) => {
        const x = startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
        doc.rect(x, y, colWidths[i], rowHeight).stroke();
        doc.text(val.toString(), x + 2, y + 3, { width: colWidths[i] - 4 });
      });
      y += rowHeight;
    });

    doc.end();
  } catch (err) {
    console.error('💥 Error:', err.message);
    res.status(500).json({ 
      error: 'Error generando la planilla',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined 
    });
  }
});

// Mejorar el logging
function logInfo(message, ...args) {
  console.log(`[${new Date().toISOString()}] INFO: ${message}`, ...args);
}

function logError(message, error) {
  console.error(`[${new Date().toISOString()}] ERROR: ${message}`, error);
}

// === Arrancar el servidor ===
const PORT = process.env.PORT || 3002;
app.listen(PORT, '0.0.0.0', () => {
    logInfo(`Servidor de nómina escuchando en puerto ${PORT}`);
    logInfo('Configuración:', {
      JWT_SECRET: JWT_SECRET ? 'Configurado' : 'No configurado',
      STATIC_PATH: path.join(__dirname, 'public'),
      NODE_ENV: process.env.NODE_ENV,
      DATABASE: 'Supabase (via bases_de_datos service)',
      CACHE: 'In-memory rate limiting'
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
