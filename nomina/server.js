require('dotenv').config();
const express = require('express');
const axios = require('axios');
const PDFDocument = require('pdfkit');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();

const SALARIO_MINIMO = 11903.13;
const RAP_PORCENTAJE = 0.015;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
  return res.status(401).json({ error: 'Credenciales inválidas' });
});

// Generar PDF de planilla
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
      axios.get('http://bases-de-datos:3000/employees'),
      axios.get('http://bases-de-datos:3000/attendance')
    ]);

    const empleados = empRes.data;
    const asistencia = asisRes.data;

    const planilla = empleados.map(emp => {
      const registros = asistencia.filter(r =>
        r.employeeId === emp.id &&
        r.date >= fechaInicio &&
        r.date <= fechaFin &&
        r.check_in && r.check_out
      );

      const horas = registros.reduce((sum, r) => {
        const [hIn, mIn] = r.check_in.split(':').map(Number);
        const [hOut, mOut] = r.check_out.split(':').map(Number);
        return sum + ((hOut * 60 + mOut) - (hIn * 60 + mIn)) / 60;
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
        salarioMensual: salarioBase.toFixed(2),
        dias,
        salarioQuincenal: salarioQuincenal.toFixed(2),
        ihss: ihss.toFixed(2),
        rap: rap.toFixed(2),
        isr: isr.toFixed(2),
        deducciones: totalDeducciones.toFixed(2),
        neto: pagoNeto.toFixed(2),
        banco: emp.banco || '',
        cuenta: emp.cuenta || ''
      };
    });

    // === PDF ===

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

// === Arrancar el servidor ===
const PORT = process.env.PORT || 3002;
app.listen(PORT, '0.0.0.0', () => console.log(`✅ Nómina corriendo en puerto ${PORT}`));

