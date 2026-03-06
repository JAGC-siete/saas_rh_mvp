import { Buffer } from 'buffer'
import { formatDateForHonduras, nowInHonduras, formatDateTimeForHonduras, formatTimeDisplay, formatDateOnlyForHonduras } from '../timezone'

export interface AttendanceItem {
  id: string
  employee_code: string
  name: string
  department: string
  position: string
  date: string
  check_in: string | null
  check_out: string | null
  hours_worked: number
  status: string
  late_minutes: number
  overtime_hours: number
  notes: string
}

export interface AttendanceSummary {
  total_employees: number
  total_days: number
  total_hours_worked: number
  total_late_minutes: number
  total_overtime_hours: number
  attendance_rate: number
  punctuality_rate: number
  average_hours_per_day: number
}

/**
 * Generates a consolidated attendance PDF (3 pages: executive summary, attendance table, department analysis)
 * Returns a Buffer that can be sent as application/pdf
 */
export async function generateConsolidatedAttendancePDF(
  attendanceData: AttendanceItem[],
  summary: AttendanceSummary,
  startDate: string,
  endDate: string,
  generatedByEmail?: string
): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    try {
      const PDFDocument = require('pdfkit')
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'portrait',
        margin: 30,
        info: {
          Title: `Reporte de Asistencia - ${startDate} a ${endDate}`,
          Author: 'Sistema de Recursos Humanos',
          Subject: 'Reporte de Asistencia',
          Keywords: 'asistencia, reporte, Paragon, Honduras',
          Creator: 'HR SaaS System'
        }
      })

      const buffers: Buffer[] = []
      doc.on('data', (chunk: Buffer) => buffers.push(chunk))
      doc.on('end', () => {
        try {
          const pdf = Buffer.concat(buffers)
          resolve(pdf)
        } catch (e) {
          reject(e)
        }
      })

      // ===== PAGE 1: HEADER & EXEC SUMMARY =====
      doc.rect(0, 0, 595, 100).fill('#1e40af')
      doc.fillColor('white')
      doc.fontSize(24).text('PARAGON HONDURAS', 30, 20, { align: 'center', width: 535 })
      doc.fontSize(16).text('Sistema de Recursos Humanos', 30, 50, { align: 'center', width: 535 })
      doc.fontSize(14).text(`REPORTE DE ASISTENCIA - ${startDate} a ${endDate}`, 30, 75, { align: 'center', width: 535 })

      doc.fillColor('black')
      doc.fontSize(10).text('INFORMACIÓN DE LA EMPRESA:', 30, 120)
      doc.fontSize(9).text('Paragon Honduras', 30, 135)
      doc.fontSize(9).text('Dirección: Tegucigalpa, Honduras', 30, 150)
      doc.fontSize(9).text('Teléfono: +504 XXXX-XXXX', 30, 165)
      doc.fontSize(9).text('Email: info@paragonhonduras.com', 30, 180)

      doc.fontSize(10).text('INFORMACIÓN DEL PERÍODO:', 300, 120)
      doc.fontSize(9).text(`Fecha inicio: ${startDate}`, 300, 135)
      doc.fontSize(9).text(`Fecha fin: ${endDate}`, 300, 150)
      doc.fontSize(9).text(`Fecha de generación: ${formatDateForHonduras(nowInHonduras())}`, 300, 165)
      if (generatedByEmail) {
        doc.fontSize(9).text(`Generado por: ${generatedByEmail}`, 300, 180)
      }

      doc.rect(30, 200, 535, 100).stroke()
      doc.fontSize(12).text('RESUMEN EJECUTIVO', 35, 210)
      doc.fontSize(10).text('Total Empleados:', 40, 230)
      doc.fontSize(10).text(summary.total_employees.toString(), 200, 230)
      doc.fontSize(10).text('Total Días Registrados:', 40, 245)
      doc.fontSize(10).text(summary.total_days.toString(), 200, 245)
      doc.fontSize(10).text('Total Horas Trabajadas:', 40, 260)
      doc.fontSize(10).text(`${summary.total_hours_worked.toFixed(2)} hrs`, 200, 260)
      doc.fontSize(10).text('Tasa de Asistencia:', 40, 275)
      doc.fontSize(10).text(`${summary.attendance_rate.toFixed(1)}%`, 200, 275)
      doc.fontSize(10).text('Tasa de Puntualidad:', 40, 290)
      doc.fontSize(10).text(`${summary.punctuality_rate.toFixed(1)}%`, 200, 290)

      // Totales por departamento
      const deptTotals: { [key: string]: { count: number, hours: number, attendance: number } } = {}
      attendanceData.forEach((row) => {
        const dept = row.department || 'Sin Departamento'
        if (!deptTotals[dept]) {
          deptTotals[dept] = { count: 0, hours: 0, attendance: 0 }
        }
        deptTotals[dept].count++
        deptTotals[dept].hours += row.hours_worked
        deptTotals[dept].attendance += row.status === 'present' ? 1 : 0
      })

      doc.fontSize(10).text('TOTALES POR DEPARTAMENTO:', 300, 230)
      let summaryDeptY = 245
      Object.entries(deptTotals).forEach(([dept, totals]) => {
        if (summaryDeptY < 290) {
          const attendanceRate = totals.count > 0 ? (totals.attendance / totals.count) * 100 : 0
          doc.fontSize(9).text(`${dept}: ${totals.count} reg. - ${totals.hours.toFixed(1)}h - ${attendanceRate.toFixed(1)}%`, 300, summaryDeptY)
          summaryDeptY += 12
        }
      })

      // ===== PAGE 2: ATTENDANCE TABLE =====
      doc.addPage()
      doc.fontSize(14).text('DETALLE DE ASISTENCIA POR EMPLEADO', 30, 30, { align: 'center', width: 535 })

      const headers = ['Código', 'Nombre', 'Departamento', 'Fecha', 'Entrada', 'Salida', 'Horas', 'Estado', 'Tardanza', 'Extra']
      const colWidths = [50, 80, 60, 60, 50, 50, 40, 50, 40, 40]
      const startX = 30
      let y = 70
      const rowHeight = 15

      headers.forEach((h, i) => {
        const x = startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0)
        doc.rect(x, y, colWidths[i], rowHeight).fillAndStroke('#1e40af', '#000')
        doc.fillColor('white')
        doc.fontSize(8).text(h, x + 2, y + 4, { width: colWidths[i] - 4, align: 'center' })
        doc.fillColor('black')
      })
      y += rowHeight

      let pageCount = 1
      attendanceData.forEach((row) => {
        if (y > 750) {
          doc.addPage()
          y = 30
          pageCount++
          doc.fontSize(10).text(`Página ${pageCount} - Continuación`, 30, 15)
        }
        const values = [
          row.employee_code || '',
          row.name,
          row.department,
          formatDateOnlyForHonduras(row.date),
          row.check_in ? formatTimeDisplay(row.check_in) : 'N/A',
          row.check_out ? formatTimeDisplay(row.check_out) : 'N/A',
          `${row.hours_worked.toFixed(1)}h`,
          row.status === 'present' ? 'Presente' : row.status === 'late' ? 'Tardanza' : 'Ausente',
          row.late_minutes > 0 ? `${row.late_minutes}min` : '0min',
          row.overtime_hours > 0 ? `${row.overtime_hours.toFixed(1)}h` : '0h'
        ]
        values.forEach((val, i) => {
          const x = startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0)
          doc.rect(x, y, colWidths[i], rowHeight).stroke()
          doc.fontSize(7).text(val.toString(), x + 2, y + 4, { width: colWidths[i] - 4, align: 'center' })
        })
        y += rowHeight
      })

      y += 5
      doc.rect(startX, y, 535, rowHeight).fillAndStroke('#f3f4f6', '#000')
      doc.fontSize(9).text('TOTALES:', startX + 5, y + 4)
      doc.fontSize(9).text(`${summary.total_days} días`, startX + 200, y + 4)
      doc.fontSize(9).text(`${summary.total_hours_worked.toFixed(1)}h`, startX + 300, y + 4)
      doc.fontSize(9).text(`${summary.attendance_rate.toFixed(1)}%`, startX + 400, y + 4)

      // ===== PAGE 3: DEPARTMENT ANALYSIS & NOTES =====
      doc.addPage()
      doc.fontSize(14).text('ANÁLISIS POR DEPARTAMENTO Y NOTAS', 30, 30, { align: 'center', width: 535 })

      doc.fontSize(10).text('ANÁLISIS POR DEPARTAMENTO:', 30, 60)
      const deptHeaders = ['Departamento', 'Registros', 'Horas Totales', 'Promedio/Día', 'Tasa Asistencia']
      const deptColWidths = [120, 60, 80, 80, 80]
      const deptStartX = 30
      let deptY = 80
      const deptRowHeight = 15

      deptHeaders.forEach((h, i) => {
        const x = deptStartX + deptColWidths.slice(0, i).reduce((a, b) => a + b, 0)
        doc.rect(x, deptY, deptColWidths[i], deptRowHeight).fillAndStroke('#1e40af', '#000')
        doc.fillColor('white')
        doc.fontSize(8).text(h, x + 2, deptY + 4, { width: deptColWidths[i] - 4, align: 'center' })
        doc.fillColor('black')
      })
      deptY += deptRowHeight

      Object.entries(deptTotals).forEach(([dept, totals]) => {
        if (deptY > 750) {
          doc.addPage()
          deptY = 30
        }
        const attendanceRate = totals.count > 0 ? (totals.attendance / totals.count) * 100 : 0
        const avgHours = totals.count > 0 ? totals.hours / totals.count : 0
        const deptValues = [
          dept,
          totals.count.toString(),
          `${totals.hours.toFixed(1)}h`,
          `${avgHours.toFixed(1)}h`,
          `${attendanceRate.toFixed(1)}%`
        ]
        deptValues.forEach((val, i) => {
          const x = deptStartX + deptColWidths.slice(0, i).reduce((a, b) => a + b, 0)
          doc.rect(x, deptY, deptColWidths[i], deptRowHeight).stroke()
          doc.fontSize(8).text(val.toString(), x + 2, deptY + 4, { width: deptColWidths[i] - 4, align: 'center' })
        })
        deptY += deptRowHeight
      })

      doc.fontSize(10).text('MÉTRICAS CLAVE:', 30, deptY + 20)
      doc.fontSize(9).text(`• Tasa de Asistencia General: ${summary.attendance_rate.toFixed(1)}%`, 30, deptY + 35)
      doc.fontSize(9).text(`• Tasa de Puntualidad: ${summary.punctuality_rate.toFixed(1)}%`, 30, deptY + 50)
      doc.fontSize(9).text(`• Promedio de Horas por Día: ${summary.average_hours_per_day.toFixed(1)} horas`, 30, deptY + 65)
      doc.fontSize(9).text(`• Total de Horas Extra: ${summary.total_overtime_hours.toFixed(1)} horas`, 30, deptY + 80)
      doc.fontSize(9).text(`• Total de Minutos de Tardanza: ${summary.total_late_minutes} minutos`, 30, deptY + 95)

      doc.fontSize(10).text('NOTAS IMPORTANTES:', 30, deptY + 120)
      doc.fontSize(9).text('• Este reporte ha sido generado automáticamente por el sistema de recursos humanos.', 30, deptY + 135)
      doc.fontSize(9).text('• Los datos de asistencia se registran en tiempo real con validación de geofence.', 30, deptY + 150)
      doc.fontSize(9).text('• Las horas extra se calculan automáticamente según el horario de trabajo configurado.', 30, deptY + 165)
      doc.fontSize(9).text('• La puntualidad se considera con una tolerancia de 15 minutos.', 30, deptY + 180)
      doc.fontSize(9).text('• Para consultas, contactar al departamento de recursos humanos.', 30, deptY + 195)

      doc.fontSize(8).text('Documento generado automáticamente - Paragon Honduras - Sistema de Recursos Humanos', 30, 800, { align: 'center', width: 535 })
      doc.fontSize(8).text(`Fecha de generación: ${formatDateTimeForHonduras(nowInHonduras())}`, 30, 815, { align: 'center', width: 535 })

      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}
