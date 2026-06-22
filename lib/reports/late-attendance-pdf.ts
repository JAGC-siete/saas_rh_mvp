import { Buffer } from 'buffer'
import { PDF, drawLiquidPdfHeader, drawLiquidSectionTitle } from '../pdf/liquid-theme'
import { formatPeriodRangeForDisplay } from '../payroll/period-dates'
import { formatDateOnlyForLocale } from '../timezone'

export type LateReportMetrics = {
  total_attendance_records: number
  total_late_incidents: number
  employees_with_late: number
  active_employees: number
}

export type LateReportEmployee = {
  employee_code: string | null
  employee_name: string
  department_name: string | null
  late_days: number
  total_late_minutes: number
  avg_late_minutes: number
  max_late_minutes: number
}

export type LateReportDetail = {
  employee_code: string | null
  employee_name: string
  department_name: string | null
  record_date: string
  expected_start: string | null
  check_in: string | null
  late_minutes: number
  grace_minutes: number
  schedule_name: string | null
  record_status: string | null
  justification: string
}

export type LateAttendanceReportData = {
  companyName: string
  companyId: string
  periodStart: string
  periodEnd: string
  metrics: LateReportMetrics
  employees: LateReportEmployee[]
  details: LateReportDetail[]
  locale?: string
  timeZone?: string
}

function formatMinutes(m: number): string {
  if (m >= 60) {
    const h = Math.floor(m / 60)
    const min = m % 60
    return min > 0 ? `${h}h ${min}min` : `${h}h`
  }
  return `${m} min`
}

export async function generateLateAttendanceReportPDF(data: LateAttendanceReportData): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    try {
      const PDFDocument = require('pdfkit')
      const locale = data.locale ?? 'es-HN'
      const tz = data.timeZone ?? 'America/Tegucigalpa'
      const periodLabel = formatPeriodRangeForDisplay(data.periodStart, data.periodEnd)
      const hasLate = (data.metrics.total_late_incidents ?? 0) > 0

      const doc = new PDFDocument({
        size: 'A4',
        layout: 'portrait',
        margin: 36,
        info: {
          Title: `Reporte de tardanzas — ${data.companyName}`,
          Author: 'Humano SISU',
          Subject: 'Reporte de tardanzas por periodo',
        },
      })

      const buffers: Buffer[] = []
      doc.on('data', (chunk: Buffer) => buffers.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(buffers)))
      doc.on('error', reject)

      const pageW = () => doc.page.width
      const left = () => doc.page.margins.left
      const innerW = () => pageW() - doc.page.margins.left - doc.page.margins.right
      const bottomSafe = () => doc.page.height - doc.page.margins.bottom - 24

      let y = drawLiquidPdfHeader(doc, {
        title: 'Reporte de tardanzas',
        subtitle: data.companyName,
        tagline: 'Humano SISU',
      })

      doc.font('Helvetica').fontSize(9).fillColor(PDF.bodyMuted)
      doc.text(`ID: ${data.companyId}`, left(), y)
      y += 14
      doc.text(`Período: ${periodLabel}`, left(), y)
      y += 14
      doc.text(
        'Criterio: entrada más de 5 minutos después del horario asignado (tolerancia del sistema).',
        left(),
        y,
        { width: innerW() }
      )
      y += 28

      drawLiquidSectionTitle(doc, 'Resumen general', left(), y)
      y += 18
      const m = data.metrics
      const summaryLines = [
        ['Registros de asistencia', String(m.total_attendance_records ?? 0)],
        ['Incidentes de tardanza', String(m.total_late_incidents ?? 0)],
        ['Empleados con tardanza', `${m.employees_with_late ?? 0} de ${m.active_employees ?? 0} activos`],
      ]
      summaryLines.forEach(([label, val]) => {
        doc.font('Helvetica').fontSize(9).fillColor(PDF.bodyText)
        doc.text(`${label}:`, left(), y, { continued: true, width: 180 })
        doc.font('Helvetica-Bold').text(` ${val}`)
        y += 14
      })

      if (!hasLate) {
        y += 8
        doc.font('Helvetica-Bold').fontSize(10).fillColor(PDF.successText)
        doc.text('¡Felicitaciones! 0 tardanzas encontradas en este periodo.', left(), y, { width: innerW() })
        y += 24
      } else {
        y += 12
        drawLiquidSectionTitle(doc, 'Ranking por empleado', left(), y)
        y += 16

        const empHeaders = ['Código', 'Empleado', 'Departamento', 'Días tarde', 'Promedio/día']
        const empWidths = [52, 130, 90, 52, 58]
        const drawRow = (cells: string[], header: boolean, rowY: number) => {
          let x = left()
          cells.forEach((cell, i) => {
            const w = empWidths[i] ?? 60
            if (header) {
              doc.rect(x, rowY, w, 18).fillAndStroke(PDF.tableHeader, PDF.tableBorder)
              doc.fillColor(PDF.tableHeaderText).font('Helvetica-Bold').fontSize(7)
            } else {
              doc.rect(x, rowY, w, 16).stroke(PDF.tableBorder)
              doc.fillColor(PDF.bodyText).font('Helvetica').fontSize(7)
            }
            doc.text(cell, x + 3, rowY + (header ? 5 : 4), { width: w - 6, lineBreak: false })
            x += w
          })
        }

        drawRow(empHeaders, true, y)
        y += 18

        for (const emp of data.employees) {
          if (y > bottomSafe() - 20) {
            doc.addPage()
            y = doc.page.margins.top
          }
          drawRow(
            [
              emp.employee_code ?? '—',
              emp.employee_name,
              emp.department_name ?? '—',
              String(emp.late_days),
              formatMinutes(Number(emp.avg_late_minutes)),
            ],
            false,
            y
          )
          y += 16
        }

        y += 16
        drawLiquidSectionTitle(doc, 'Detalle por fecha', left(), y)
        y += 16

        const detHeaders = ['Fecha', 'Empleado', 'Esperada', 'Entrada', 'Min. tarde']
        const detWidths = [52, 120, 42, 42, 48]
        const drawDetHeader = (rowY: number) => {
          let x = left()
          detHeaders.forEach((h, i) => {
            const w = detWidths[i]
            doc.rect(x, rowY, w, 18).fillAndStroke(PDF.tableHeader, PDF.tableBorder)
            doc.fillColor(PDF.tableHeaderText).font('Helvetica-Bold').fontSize(7).text(h, x + 2, rowY + 5, { width: w - 4 })
            x += w
          })
        }

        drawDetHeader(y)
        y += 18

        for (const row of data.details) {
          if (y > bottomSafe() - 18) {
            doc.addPage()
            y = doc.page.margins.top
            drawDetHeader(y)
            y += 18
          }
          let x = left()
          const cells = [
            formatDateOnlyForLocale(row.record_date, locale, tz),
            row.employee_name,
            row.expected_start ?? '—',
            row.check_in ?? '—',
            String(row.late_minutes),
          ]
          cells.forEach((cell, i) => {
            const w = detWidths[i]
            doc.rect(x, y, w, 15).stroke(PDF.tableBorder)
            doc.fillColor(PDF.bodyText).font('Helvetica').fontSize(7).text(cell, x + 2, y + 4, { width: w - 4 })
            x += w
          })
          y += 15
        }
      }

      doc.end()
    } catch (e) {
      reject(e)
    }
  })
}
