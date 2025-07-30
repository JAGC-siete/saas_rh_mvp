// bases_de_datos/server.js - Supabase Database Service

const express = require('express');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Supabase PostgreSQL connection
const pool = new Pool({
  user: process.env.SUPABASE_DB_USER || process.env.DB_USER,
  host: process.env.SUPABASE_DB_HOST || process.env.DB_HOST,
  database: process.env.SUPABASE_DB_NAME || process.env.DB_NAME,
  password: process.env.SUPABASE_DB_PASSWORD || process.env.DB_PASSWORD,
  port: process.env.SUPABASE_DB_PORT || process.env.DB_PORT || 5432,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT NOW()');
    res.json({ 
      status: 'healthy', 
      service: 'bases_de_datos',
      database: 'Supabase',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'unhealthy', 
      service: 'bases_de_datos',
      database: 'Supabase',
      error: error.message 
    });
  }
});

// GET endpoint for employees data (Supabase schema)
app.get('/employees', async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT 
        id,
        name,
        dni,
        role,
        position,
        base_salary,
        bank_name,
        bank_account,
        status,
        hire_date,
        employee_code
      FROM employees 
      WHERE status = 'active'
      ORDER BY name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error fetching employees:', err);
    res.status(500).json({ error: 'Error fetching employees' });
  } finally {
    client.release();
  }
});

// GET endpoint for attendance data (Supabase schema)
app.get('/attendance', async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT 
        ar.id,
        ar.employee_id,
        ar.date,
        ar.check_in,
        ar.check_out,
        ar.expected_check_in,
        ar.expected_check_out,
        ar.late_minutes,
        ar.early_departure_minutes,
        ar.justification,
        ar.status,
        e.dni,
        e.name as employee_name
      FROM attendance_records ar
      JOIN employees e ON ar.employee_id = e.id
      ORDER BY ar.date DESC, ar.check_in DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error fetching attendance:', err);
    res.status(500).json({ error: 'Error fetching attendance' });
  } finally {
    client.release();
  }
});

// POST endpoint for attendance registration (Supabase schema)
app.post('/attendance', async (req, res) => {
  const { last5, justification } = req.body;
  const client = await pool.connect();

  try {
    // Find employee by last 5 digits of DNI
    const empleadoResult = await client.query(
      `SELECT * FROM employees WHERE RIGHT(dni, 5) = $1 AND status = 'active'`,
      [last5]
    );

    if (empleadoResult.rows.length === 0) {
      return res.status(404).json({ message: 'Empleado no encontrado.' });
    }

    const empleado = empleadoResult.rows[0];
    const now = new Date();
    const horaActual = now.toTimeString().slice(0, 5);
    const fechaHoy = now.toISOString().split('T')[0];

    // Check existing attendance record for today
    const asistenciaResult = await client.query(
      `SELECT * FROM attendance_records WHERE employee_id = $1 AND date = $2`,
      [empleado.id, fechaHoy]
    );

    const asistenciaHoy = asistenciaResult.rows[0];

    // PRIMER REGISTRO → CHECK IN
    if (!asistenciaHoy || !asistenciaHoy.check_in) {
      const horaEsperada = empleado.expected_check_in || '08:00';
      
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

      if (asistenciaHoy) {
        // Update existing record
        await client.query(
          `UPDATE attendance_records 
           SET check_in = $1, justification = $2, late_minutes = $3, updated_at = NOW()
           WHERE id = $4`,
          [horaActual, justification || null, Math.max(0, diferencia), asistenciaHoy.id]
        );
      } else {
        // Insert new record
        await client.query(
          `INSERT INTO attendance_records (employee_id, date, check_in, expected_check_in, justification, late_minutes, status)
           VALUES ($1, $2, $3, $4, $5, $6, 'present')`,
          [empleado.id, fechaHoy, horaActual, horaEsperada, justification || null, Math.max(0, diferencia)]
        );
      }

      return res.status(200).json({ message: mensaje });
    }

    // SEGUNDO REGISTRO → CHECK OUT
    if (!asistenciaHoy.check_out) {
      const horaEsperada = empleado.expected_check_out || '17:00';
      
      const [h1, m1] = horaActual.split(':').map(Number);
      const [h2, m2] = horaEsperada.split(':').map(Number);
      const diferencia = (h1 * 60 + m1) - (h2 * 60 + m2);

      const mensaje = diferencia < -5
        ? '🔄 Salida anticipada registrada.'
        : diferencia > 5
          ? '⏱️ Salida tardía registrada.'
          : '✅ Salida registrada correctamente.';

      await client.query(
        `UPDATE attendance_records 
         SET check_out = $1, early_departure_minutes = $2, updated_at = NOW()
         WHERE id = $3`,
        [horaActual, Math.max(0, -diferencia), asistenciaHoy.id]
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

// Serve the attendance HTML
app.get('/attendance', (req, res) => {
  res.sendFile(path.join(__dirname, 'asistencia.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Bases de datos service corriendo en puerto ${PORT}`);
  console.log(`📊 Conectado a Supabase PostgreSQL`);
});
