import PDFDocument from 'pdfkit';

const SALARIO_MINIMO = 11903.13;
const RAP_PORCENTAJE = 0.015;

export default class PayrollService {
  constructor(employeeRepo, attendanceRepo) {
    this.employeeRepo = employeeRepo;
    this.attendanceRepo = attendanceRepo;
  }

  calcularISR(salarioBase) {
    const ingresoAnual = salarioBase * 12;
    const rentaNeta = ingresoAnual - 40000;
    if (rentaNeta <= 217493.16) return 0;
    if (rentaNeta <= 494224.40) return ((rentaNeta - 217493.16) * 0.15) / 12;
    if (rentaNeta <= 771252.37) return (41610.33 + (rentaNeta - 494224.40) * 0.20) / 12;
    return (96916.30 + (rentaNeta - 771252.37) * 0.25) / 12;
  }

  formatoLempiras(n) {
    return new Intl.NumberFormat('es-HN', {
      style: 'currency',
      currency: 'HNL',
      minimumFractionDigits: 2
    }).format(n);
  }

  async generatePayroll(periodo, quincena) {
    const empleados = await this.employeeRepo.findAll();
    const asistencia = await this.attendanceRepo.findAll();

    const [year, month] = periodo.split('-').map(Number);
    const ultimoDia = new Date(year, month, 0).getDate();
    const fechaInicio = quincena === 1 ? `${periodo}-01` : `${periodo}-16`;
    const fechaFin = quincena === 1 ? `${periodo}-15` : `${periodo}-${ultimoDia}`;
    const aplicarDeducciones = quincena === 2;

    const planilla = empleados.map(emp => {
      if (!emp.dni) return null;

      const registros = asistencia.filter(r => {
        if (!r.last5 || !r.check_in || !r.check_out || !r.date) return false;
        const matchLast5 = r.last5.toString().trim() === emp.dni.slice(-5).trim();
        const recordDate = new Date(r.date);
        const startDate = new Date(fechaInicio);
        const endDate = new Date(fechaFin);
        return matchLast5 && recordDate >= startDate && recordDate <= endDate;
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

      const salarioBase = emp.base_salary || 15000;
      const salarioHora = salarioBase / 30 / 8;
      const salarioQuincenal = salarioHora * horas;

      const ihss = aplicarDeducciones ? Math.min(salarioBase, SALARIO_MINIMO) * 0.05 : 0;
      const rap = aplicarDeducciones ? Math.max(0, salarioBase - SALARIO_MINIMO) * RAP_PORCENTAJE : 0;
      const isr = aplicarDeducciones ? this.calcularISR(salarioBase) : 0;
      const totalDeducciones = ihss + rap + isr;
      const pagoNeto = salarioQuincenal - totalDeducciones;

      return {
        nombre: emp.name,
        cargo: emp.role || '',
        salarioMensual: this.formatoLempiras(salarioBase),
        dias: registros.length,
        salarioQuincenal: this.formatoLempiras(salarioQuincenal),
        ihss: this.formatoLempiras(ihss),
        rap: this.formatoLempiras(rap),
        isr: this.formatoLempiras(isr),
        deducciones: this.formatoLempiras(totalDeducciones),
        neto: this.formatoLempiras(pagoNeto),
        banco: emp.bank || '',
        cuenta: emp.account || ''
      };
    }).filter(Boolean);

    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 20 });
    let buffers = [];

    doc.on('data', buffers.push.bind(buffers));
    return new Promise(resolve => {
      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });

      doc.fontSize(10).text(`PLANILLA QUINCENAL - ${periodo} Q${quincena}`, { align: 'center' }).moveDown();
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
    });
  }
}
