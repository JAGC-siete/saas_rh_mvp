// asistencia/server.js

const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const { DateTime } = require('luxon');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
require('dotenv').config();

const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(rateLimit({ windowMs: 60 * 1000, max: 100 }));
app.use(mongoSanitize());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Config DB
const pool = new Pool({
  user: process.env.DB_USER || 'admin',
  host: process.env.DB_HOST || 'postgres',
  database: process.env.DB_NAME || 'saas_db',
  password: process.env.DB_PASSWORD || 'secret',
  port: process.env.DB_PORT || 5432,
});

const metrics = { requestCount: 0 };
app.use((req, res, next) => { metrics.requestCount++; next(); });

app.get('/metrics', (req, res) => {
  res.json({ uptime: process.uptime(), memory: process.memoryUsage().rss, requests: metrics.requestCount });
});

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy' });
  } catch {
    res.status(503).json({ status: 'unhealthy' });
  }
});

// POST /attendance
app.post('/attendance', async (req, res) => {
  const { last5, justification } = req.body;
  const client = await pool.connect();

  const now = DateTime.now().setZone('America/Tegucigalpa');
  const horaActual = now.toFormat('HH:mm');
  const fechaHoy = now.toISODate();

  try {
    const empleadoResult = await client.query(
      `SELECT * FROM employees WHERE RIGHT(REPLACE(dni, '-', ''), 5) = $1`,
      [last5]
    );

    if (empleadoResult.rows.length === 0) {
      return res.status(404).json({ message: 'Empleado no encontrado.' });
    }

    const empleado = empleadoResult.rows[0];
    const asistenciaResult = await client.query(
      `SELECT * FROM control_asistencia WHERE last5 = $1 AND date = $2`,
      [last5, fechaHoy]
    );

    const asistenciaHoy = asistenciaResult.rows[0];

    // === CHECK IN ===
    if (!asistenciaHoy || !asistenciaHoy.check_in) {
      const horaEsperada = empleado.checkin_time;
      if (!horaEsperada) {
        return res.status(500).json({ message: 'Empleado sin hora de entrada asignada.' });
      }

      const [h1, m1] = horaActual.split(':').map(Number);
      const [h2, m2] = horaEsperada.split(':').map(Number);
      const diferencia = (h1 * 60 + m1) - (h2 * 60 + m2);

      if (diferencia > 5 && !justification) {
        return res.status(422).json({
          requireJustification: true,
          message: '⏰ Llegaste tarde. ¿Qué sucedió? Por favor justifica tu demora.'
        });
      }

      const mensaje = diferencia <= -5
        ? '🎉 Felicidades, eres un empleado ejemplar.'
        : diferencia > 5
          ? '📝 Asistencia registrada con justificación.'
          : '✅ Asistencia registrada a tiempo.';

      await client.query(
        `INSERT INTO control_asistencia (last5, date, check_in, justification)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (last5, date) DO UPDATE 
         SET check_in = EXCLUDED.check_in, justification = EXCLUDED.justification`,
        [last5, fechaHoy, horaActual, justification || null]
      );

      return res.status(200).json({ message: mensaje });
    }

    // === CHECK OUT ===
    if (!asistenciaHoy.check_out) {
      const horaEsperada = empleado.checkout_time;
      if (!horaEsperada) {
        return res.status(500).json({ message: 'Empleado sin hora de salida asignada.' });
      }

      const [h1, m1] = horaActual.split(':').map(Number);
      const [h2, m2] = horaEsperada.split(':').map(Number);
      const diferencia = (h1 * 60 + m1) - (h2 * 60 + m2);

      const mensaje = diferencia < -5
        ? '🔄 Salida anticipada registrada.'
        : diferencia > 5
          ? '⏱️ Salida tardía registrada.'
          : '✅ Salida registrada correctamente.';

      await client.query(
        `UPDATE control_asistencia SET check_out = $1 WHERE last5 = $2 AND date = $3`,
        [horaActual, last5, fechaHoy]
      );

      return res.status(200).json({ message: mensaje });
    }

    return res.status(200).json({ message: '📌 Ya registraste entrada y salida hoy.' });

  } catch (err) {
    console.error('❌ Error registrando asistencia:', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  } finally {
    client.release();
  }
});

// HTML de interfaz
app.get('/attendance', (req, res) => {
  res.sendFile(path.join(__dirname, 'asistencia.html'));
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
  console.log(`✅ Asistencia corriendo en puerto ${PORT}`);
});
