// asistencia/server.js

import express from 'express';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

const { Pool } = pg;
dotenv.config();

// ES modules fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

const pool = new Pool({
  user: process.env.DB_USER || 'admin',
  host: process.env.DB_HOST || 'postgres',
  database: process.env.DB_NAME || 'saas_db',
  password: process.env.DB_PASSWORD || 'secret',
  port: process.env.DB_PORT || 5432,
});

app.post('/attendance', async (req, res) => {
  const { last5, justification } = req.body;
  const client = await pool.connect();

  try {
    const empleadoResult = await client.query(
      `SELECT * FROM employees WHERE RIGHT(dni, 5) = $1`,
      [last5]
    );

    if (empleadoResult.rows.length === 0) {
      return res.status(404).json({ message: 'Empleado no encontrado.' });
    }

    const empleado = empleadoResult.rows[0];
    const now = new Date();
    const horaActual = now.toTimeString().slice(0, 5);
    const fechaHoy = now.toISOString().split('T')[0];

    const asistenciaResult = await client.query(
      `SELECT * FROM control_asistencia WHERE id_empleado = $1 AND date = $2`,
      [empleado.id, fechaHoy]
    );

    const asistenciaHoy = asistenciaResult.rows[0];

    // PRIMER REGISTRO → CHECK IN
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
          message: '¿Qué sucedió? Por favor justifica tu demora.'
        });
      }

      const mensaje = diferencia <= -5
        ? '🎉 Felicidades, eres un empleado ejemplar.'
        : diferencia > 5
          ? '📝 Asistencia registrada con justificación.'
          : '✅ Asistencia registrada.';

      await client.query(
        `INSERT INTO control_asistencia (id_empleado, date, check_in, justificacion)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id_empleado, date) DO UPDATE SET check_in = EXCLUDED.check_in, justificacion = EXCLUDED.justificacion`,
        [empleado.id, fechaHoy, horaActual, justification || null]
      );

      return res.status(200).json({ message: mensaje });
    }

    // SEGUNDO REGISTRO → CHECK OUT
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
        `UPDATE control_asistencia SET check_out = $1 WHERE id = $2`,
        [horaActual, asistenciaHoy.id]
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

// Sirve el HTML de registro
app.get('/attendance', (req, res) => {
  res.sendFile(path.join(__dirname, 'asistencia.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Bases de datos corriendo en puerto ${PORT}`);
});
