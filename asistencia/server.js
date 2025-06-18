// asistencia/server.js
const express = require('express');
const path = require('path');
require('dotenv').config();

const pool = require('./src/infrastructure/db');
const PostgresAttendanceRepository = require('./src/infrastructure/PostgresAttendanceRepository');
const AttendanceService = require('./src/application/AttendanceService');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const repository = new PostgresAttendanceRepository(pool);
const service = new AttendanceService(repository);

app.post('/attendance', async (req, res) => {
  const { last5, justification } = req.body;
  try {
    const result = await service.registerAttendance(last5, justification);
    const { status, ...body } = result;
    res.status(status).json(body);
  } catch (err) {
    console.error('❌ Error registrando asistencia:', err);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
});

app.get('/attendance', (req, res) => {
  res.sendFile(path.join(__dirname, 'asistencia.html'));
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
  console.log(`✅ Asistencia corriendo en puerto ${PORT}`);
});
