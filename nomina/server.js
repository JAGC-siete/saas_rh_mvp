import 'dotenv/config';
import express from 'express';
import axios from 'axios';
import PDFDocument from 'pdfkit';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';
import Redis from 'ioredis';

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

const SALARIO_MINIMO = 11903.13;
const RAP_PORCENTAJE = 0.015;
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

// Simple health check removed in favor of the detailed one above

app.post('/login', (req, res) => {
  const { usuario, password } = req.body;
  if (usuario === 'admin' && password === '1234') {
    const token = jwt.sign({ usuario }, JWT_SECRET, { expiresIn: '1h' });
    return res.json({ token });
  }
  return res.status(401).json({ error: 'Credenciales inválidas' });
});

app.post('/planilla', authenticateToken, async (req, res) => {
  const { periodo, quincena } = req.body;
  if (!/^\d{4}-\d{2}$/.test(periodo)) return res.status(400).json({ error: 'Periodo inválido (YYYY-MM)' });
  const q = parseInt(quincena);
  if (![1, 2].includes(q)) return res.status(400).json({ error: 'Quincena inválida' });

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
        if (!r.last5 || !r.check_in || !r.check_out || !r.date) return false;

        const matchLast5 = r.last5.toString().trim() === emp.dni.slice(-5).trim();
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
        banco: emp.bank || '',
        cuenta: emp.account || ''
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
