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

export interface AttendancePDFOptions {
  /** Nombre mostrado en cabecera e información de empresa */
  companyDisplayName?: string
  /** Color principal (#rrggbb) desde parámetros de reporte */
  primaryColor?: string
  /** Tabla de detalle dinámica (columnas configuradas); si no se envía, se usa el layout fijo histórico */
  detailTable?: { headers: string[]; rows: (string | number)[][] }
}

/** Ancho de columnas: más ancho para la columna "Empleado" / nombre. */
function columnWidthsForHeaders(headers: string[], tableInnerWidth: number): number[] {
  const n = Math.max(1, headers.length)
  const empIdx = headers.findIndex((h) => /empleado/i.test(h) || /^nombre$/i.test(h.trim()))
  const minEmp = 168
  if (empIdx < 0 || tableInnerWidth < minEmp + (n - 1) * 36) {
    const w = Math.floor(tableInnerWidth / n)
    return headers.map((_, i) => (i === n - 1 ? tableInnerWidth - w * (n - 1) : w))
  }
  const other = n - 1
  const rest = tableInnerWidth - minEmp
  const base = Math.floor(rest / other)
  const widths = headers.map((_, i) => (i === empIdx ? minEmp : base))
  const slack = tableInnerWidth - widths.reduce((a, b) => a + b, 0)
  widths[empIdx] += slack
  return widths
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
  generatedByEmail?: string,
  options?: AttendancePDFOptions
): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    try {
      const PDFDocument = require('pdfkit')
      const headerColor = options?.primaryColor && /^#[0-9A-Fa-f]{6}$/.test(options.primaryColor)
        ? options.primaryColor
        : '#1e40af'
      const companyName = (options?.companyDisplayName || 'Empresa').trim()
      const companyLabel = companyName.toUpperCase()

      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 30,
        info: {
          Title: `Reporte de Asistencia - ${startDate} a ${endDate}`,
          Author: companyName,
          Subject: 'Reporte de Asistencia',
          Keywords: 'asistencia, reporte, Honduras',
          Creator: 'HR SaaS',
        },
      })

      const pageW = () => doc.page.width
      const pageH = () => doc.page.height
      const left = () => doc.page.margins.left
      const innerW = () => pageW() - doc.page.margins.left - doc.page.margins.right

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

      const HEADER_BAND = 100
      const L = left()
      const W = innerW()

      // ===== PAGE 1: HEADER & EXEC SUMMARY =====
      doc.rect(0, 0, pageW(), HEADER_BAND).fill(headerColor)
      doc.fillColor('white')

      let hy = 14
      doc.fontSize(17)
      const companyBlockH = doc.heightOfString(companyLabel, { width: W, align: 'center' })
      doc.text(companyLabel, L, hy, { width: W, align: 'center', lineBreak: true })
      hy += Math.min(companyBlockH, 52) + 8

      doc.fontSize(12).text(`REPORTE DE ASISTENCIA — ${startDate} a ${endDate}`, L, hy, { width: W, align: 'center' })

      doc.fillColor('black')
      let blockY = HEADER_BAND + 14

      doc.fontSize(10).text('INFORMACIÓN DE LA EMPRESA:', L, blockY)
      doc.fontSize(10).text(companyName, L, blockY + 14, { width: 360, lineBreak: true })

      const afterCompanyY = blockY + 14 + doc.heightOfString(companyName, { width: 360 }) + 10

      const rightColX = L + Math.min(400, Math.floor(W * 0.48))
      doc.fontSize(10).text('INFORMACIÓN DEL PERÍODO:', rightColX, blockY)
      doc.fontSize(9).text(`Fecha inicio: ${startDate}`, rightColX, blockY + 14)
      doc.fontSize(9).text(`Fecha fin: ${endDate}`, rightColX, blockY + 28)
      doc.fontSize(9).text(`Fecha de generación: ${formatDateForHonduras(nowInHonduras())}`, rightColX, blockY + 42)
      if (generatedByEmail) {
        doc.fontSize(9).text(`Generado por: ${generatedByEmail}`, rightColX, blockY + 56)
      }

      const summaryTop = Math.max(afterCompanyY, blockY + 72) + 8
      doc.rect(L, summaryTop, W, 100).stroke()
      doc.fontSize(12).text('RESUMEN EJECUTIVO', L + 5, summaryTop + 8)
      doc.fontSize(10).text('Total Empleados:', L + 10, summaryTop + 28)
      doc.fontSize(10).text(summary.total_employees.toString(), L + 200, summaryTop + 28)
      doc.fontSize(10).text('Total Días Registrados:', L + 10, summaryTop + 43)
      doc.fontSize(10).text(summary.total_days.toString(), L + 200, summaryTop + 43)
      doc.fontSize(10).text('Total Horas Trabajadas:', L + 10, summaryTop + 58)
      doc.fontSize(10).text(`${summary.total_hours_worked.toFixed(2)} hrs`, L + 200, summaryTop + 58)
      doc.fontSize(10).text('Tasa de Asistencia:', L + 10, summaryTop + 73)
      doc.fontSize(10).text(`${summary.attendance_rate.toFixed(1)}%`, L + 200, summaryTop + 73)
      doc.fontSize(10).text('Tasa de Puntualidad:', L + 10, summaryTop + 88)
      doc.fontSize(10).text(`${summary.punctuality_rate.toFixed(1)}%`, L + 200, summaryTop + 88)

      const deptTotals: { [key: string]: { count: number; hours: number; attendance: number } } = {}
      attendanceData.forEach((row) => {
        const dept = row.department || 'Sin Departamento'
        if (!deptTotals[dept]) {
          deptTotals[dept] = { count: 0, hours: 0, attendance: 0 }
        }
        deptTotals[dept].count++
        deptTotals[dept].hours += row.hours_worked
        deptTotals[dept].attendance += row.status === 'present' ? 1 : 0
      })

      doc.fontSize(10).text('TOTALES POR DEPARTAMENTO:', rightColX, summaryTop + 28)
      let summaryDeptY = summaryTop + 44
      Object.entries(deptTotals).forEach(([dept, totals]) => {
        if (summaryDeptY < summaryTop + 92) {
          const attendanceRate = totals.count > 0 ? (totals.attendance / totals.count) * 100 : 0
          doc
            .fontSize(9)
            .text(`${dept}: ${totals.count} reg. — ${totals.hours.toFixed(1)}h — ${attendanceRate.toFixed(1)}%`, rightColX, summaryDeptY, {
              width: W - (rightColX - L) - 10,
              lineBreak: true,
            })
          summaryDeptY += 14
        }
      })

      // ===== PAGE 2: ATTENDANCE TABLE =====
      doc.addPage()
      doc.fontSize(14).text('DETALLE DE ASISTENCIA POR EMPLEADO', L, 28, { align: 'center', width: W })

      const tableInnerWidth = W
      const startX = L
      let y = 58
      const headerRowH = 22
      const minDataRowH = 18

      const drawAttendanceHeaderRow = (headers: string[], colWidths: number[]) => {
        headers.forEach((h, i) => {
          const x = startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0)
          doc.rect(x, y, colWidths[i], headerRowH).fillAndStroke(headerColor, '#000')
          doc.fillColor('white')
          doc.fontSize(8).text(h, x + 3, y + 6, { width: colWidths[i] - 6, align: 'center', lineBreak: true })
          doc.fillColor('black')
        })
        y += headerRowH
      }

      let headers: string[]
      let colWidths: number[]
      let dataRows: (string | number)[][]

      if (options?.detailTable?.headers?.length && options.detailTable.rows) {
        headers = options.detailTable.headers
        colWidths = columnWidthsForHeaders(headers, tableInnerWidth)
        dataRows = options.detailTable.rows.map((r) =>
          headers.map((_, i) => (r[i] !== undefined && r[i] !== null ? r[i] : ''))
        )
      } else {
        headers = ['Código', 'Nombre', 'Departamento', 'Fecha', 'Entrada', 'Salida', 'Horas', 'Estado', 'Tardanza', 'Extra']
        colWidths = columnWidthsForHeaders(headers, tableInnerWidth)
        dataRows = attendanceData.map((row) => [
          row.employee_code || '',
          row.name,
          row.department,
          formatDateOnlyForHonduras(row.date),
          row.check_in ? formatTimeDisplay(row.check_in) : 'N/A',
          row.check_out ? formatTimeDisplay(row.check_out) : 'N/A',
          `${row.hours_worked.toFixed(1)}h`,
          row.status === 'present' ? 'Presente' : row.status === 'late' ? 'Tardanza' : 'Ausente',
          row.late_minutes > 0 ? `${row.late_minutes}min` : '0min',
          row.overtime_hours > 0 ? `${row.overtime_hours.toFixed(1)}h` : '0h',
        ])
      }

      const empColIdx = headers.findIndex((h) => /empleado/i.test(h) || /^nombre$/i.test(h.trim()))

      drawAttendanceHeaderRow(headers, colWidths)

      let pageCount = 1
      const bottomSafe = pageH() - doc.page.margins.bottom - 24

      dataRows.forEach((values) => {
        const cellHeights = values.map((val, i) => {
          const cw = colWidths[i] - 6
          const s = String(val ?? '')
          doc.fontSize(8)
          const align = i === empColIdx ? 'left' : 'center'
          return doc.heightOfString(s, { width: cw, align }) + 8
        })
        const rowH = Math.min(48, Math.max(minDataRowH, Math.max(...cellHeights)))

        if (y + rowH > bottomSafe) {
          doc.addPage()
          y = doc.page.margins.top
          pageCount++
          doc.fontSize(10).text(`Página ${pageCount} — Continuación`, L, y - 6)
          drawAttendanceHeaderRow(headers, colWidths)
        }

        values.forEach((val, i) => {
          const x = startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0)
          doc.rect(x, y, colWidths[i], rowH).stroke()
          doc.fillColor('black')
          doc.fontSize(8)
          const cw = colWidths[i] - 6
          const align = i === empColIdx ? 'left' : 'center'
          doc.text(String(val ?? ''), x + 3, y + 4, { width: cw, align, lineBreak: true })
        })
        y += rowH
      })

      y += 6
      doc.rect(startX, y, W, minDataRowH).fillAndStroke('#f3f4f6', '#000')
      doc.fontSize(9).text('TOTALES:', startX + 6, y + 5)
      doc.fontSize(9).text(`${summary.total_days} días`, startX + 220, y + 5)
      doc.fontSize(9).text(`${summary.total_hours_worked.toFixed(1)}h`, startX + 360, y + 5)
      doc.fontSize(9).text(`${summary.attendance_rate.toFixed(1)}%`, startX + 480, y + 5)

      // ===== PAGE 3: DEPARTMENT ANALYSIS & NOTES =====
      doc.addPage()
      doc.fontSize(14).text('ANÁLISIS POR DEPARTAMENTO Y NOTAS', L, 28, { align: 'center', width: W })

      doc.fontSize(10).text('ANÁLISIS POR DEPARTAMENTO:', L, 56)
      const deptHeaders = ['Departamento', 'Registros', 'Horas Totales', 'Promedio/Día', 'Tasa Asistencia']
      const deptColWidths = columnWidthsForHeaders(deptHeaders, Math.min(520, W))
      const deptStartX = L
      let deptY = 76
      const deptHeaderH = 20

      deptHeaders.forEach((h, i) => {
        const x = deptStartX + deptColWidths.slice(0, i).reduce((a, b) => a + b, 0)
        doc.rect(x, deptY, deptColWidths[i], deptHeaderH).fillAndStroke(headerColor, '#000')
        doc.fillColor('white')
        doc.fontSize(8).text(h, x + 2, deptY + 5, { width: deptColWidths[i] - 4, align: 'center', lineBreak: true })
        doc.fillColor('black')
      })
      deptY += deptHeaderH

      Object.entries(deptTotals).forEach(([dept, totals]) => {
        if (deptY > bottomSafe - 40) {
          doc.addPage()
          deptY = doc.page.margins.top + 20
        }
        const attendanceRate = totals.count > 0 ? (totals.attendance / totals.count) * 100 : 0
        const avgHours = totals.count > 0 ? totals.hours / totals.count : 0
        const deptValues = [
          dept,
          totals.count.toString(),
          `${totals.hours.toFixed(1)}h`,
          `${avgHours.toFixed(1)}h`,
          `${attendanceRate.toFixed(1)}%`,
        ]
        const drh = 16
        deptValues.forEach((val, i) => {
          const x = deptStartX + deptColWidths.slice(0, i).reduce((a, b) => a + b, 0)
          doc.rect(x, deptY, deptColWidths[i], drh).stroke()
          doc.fontSize(8).text(val.toString(), x + 2, deptY + 4, { width: deptColWidths[i] - 4, align: 'center', lineBreak: true })
        })
        deptY += drh
      })

      doc.fontSize(10).text('MÉTRICAS CLAVE:', L, deptY + 18)
      doc.fontSize(9).text(`• Tasa de Asistencia General: ${summary.attendance_rate.toFixed(1)}%`, L, deptY + 34)
      doc.fontSize(9).text(`• Tasa de Puntualidad: ${summary.punctuality_rate.toFixed(1)}%`, L, deptY + 49)
      doc.fontSize(9).text(`• Promedio de Horas por Día: ${summary.average_hours_per_day.toFixed(1)} horas`, L, deptY + 64)
      doc.fontSize(9).text(`• Total de Horas Extra: ${summary.total_overtime_hours.toFixed(1)} horas`, L, deptY + 79)
      doc.fontSize(9).text(`• Total de Minutos de Tardanza: ${summary.total_late_minutes} minutos`, L, deptY + 94)

      doc.fontSize(10).text('NOTAS IMPORTANTES:', L, deptY + 118)
      doc.fontSize(9).text('• Este reporte ha sido generado automáticamente por el sistema.', L, deptY + 134)
      doc.fontSize(9).text('• Los datos de asistencia provienen de los registros consolidados en el sistema.', L, deptY + 149)
      doc.fontSize(9).text('• Las horas extra dependen del horario y reglas configuradas para la empresa.', L, deptY + 164)
      doc.fontSize(9).text('• Para aclaraciones, contacte al área de recursos humanos de su organización.', L, deptY + 179)

      const fy = pageH() - 36
      doc.fontSize(8).text(`Documento generado automáticamente — ${companyName}`, L, fy, { align: 'center', width: W })
      doc.fontSize(8).text(`Fecha de generación: ${formatDateTimeForHonduras(nowInHonduras())}`, L, fy + 12, { align: 'center', width: W })

      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}
