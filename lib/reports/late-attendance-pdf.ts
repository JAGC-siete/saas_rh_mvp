import { Buffer } from 'buffer'
import {
  PDF,
  PDF_FOOTER_RESERVE,
  drawLiquidPdfHeader,
  drawLiquidSectionTitle,
  drawLiquidTableHeader,
  drawLiquidTableRowBackground,
  liquidReportFooterBrandLine,
  registerLiquidPageFooter,
  strokeLiquidTableCells,
} from '../pdf/liquid-theme'
import { formatPeriodRangeForDisplay } from '../payroll/period-dates'
import { formatDateOnlyForLocale, formatDateTimeForHonduras } from '../timezone'

export const LATE_ARRIVAL_REPORT_TITLE = 'Reporte de llegadas tarde'

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

/** Round float avg minutes (avoids `9h 51.10000000000002min`). */
export function formatLateMinutes(m: number): string {
  const total = Math.max(0, Math.round(Number(m) || 0))
  if (total >= 60) {
    const h = Math.floor(total / 60)
    const min = total % 60
    return min > 0 ? `${h}h ${min}min` : `${h}h`
  }
  return `${total} min`
}

/** Absolute text — never advances PDFKit flow cursor / auto page-break. */
function absText(
  doc: PDFKit.PDFDocument,
  text: string,
  x: number,
  y: number,
  opts: PDFKit.Mixins.TextOptions = {}
): void {
  doc.text(text, x, y, { lineBreak: false, ellipsis: true, ...opts })
}

export async function generateLateAttendanceReportPDF(data: LateAttendanceReportData): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    try {
      const PDFDocument = require('pdfkit')
      const locale = data.locale ?? 'es-HN'
      const tz = data.timeZone ?? 'America/Tegucigalpa'
      const periodLabel = formatPeriodRangeForDisplay(data.periodStart, data.periodEnd)
      const hasLate = (data.metrics.total_late_incidents ?? 0) > 0
      const generatedAt = formatDateTimeForHonduras(new Date())
      const footerBrandLine = liquidReportFooterBrandLine(data.companyName)

      // Larger bottom margin so manual layout never collides with footer → blank pages.
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'portrait',
        margins: { top: 36, bottom: 56, left: 36, right: 36 },
        autoFirstPage: true,
        bufferPages: true,
        info: {
          Title: `${LATE_ARRIVAL_REPORT_TITLE} — ${data.companyName}`,
          Author: data.companyName,
          Subject: LATE_ARRIVAL_REPORT_TITLE,
        },
      })

      const buffers: Buffer[] = []
      doc.on('data', (chunk: Buffer) => buffers.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(buffers)))
      doc.on('error', reject)

      registerLiquidPageFooter(doc, {
        brandLine: footerBrandLine,
        generatedAt,
      })

      const left = () => doc.page.margins.left
      const innerW = () => doc.page.width - doc.page.margins.left - doc.page.margins.right
      const bottomSafe = () => doc.page.height - Math.max(PDF_FOOTER_RESERVE, doc.page.margins.bottom) - 4

      let y = drawLiquidPdfHeader(doc, {
        title: LATE_ARRIVAL_REPORT_TITLE,
        subtitle: data.companyName,
        tagline: false,
      })

      // Meta panel
      const metaH = 54
      doc.roundedRect(left(), y, innerW(), metaH, 8).fillAndStroke(PDF.panelBg, PDF.panelBorder)
      doc.font('Helvetica').fontSize(8).fillColor(PDF.bodyMuted)
      absText(doc, `ID: ${data.companyId}`, left() + 12, y + 10, { width: innerW() - 24 })
      doc.font('Helvetica-Bold').fontSize(9).fillColor(PDF.bodyText)
      absText(doc, `Período: ${periodLabel}`, left() + 12, y + 24, { width: innerW() - 24 })
      doc.font('Helvetica').fontSize(8).fillColor(PDF.bodyMuted)
      absText(
        doc,
        'Criterio: entrada más de 5 min después del horario asignado (tolerancia del sistema).',
        left() + 12,
        y + 38,
        { width: innerW() - 24 }
      )
      y += metaH + 18

      drawLiquidSectionTitle(doc, 'Resumen general', left(), y)
      y += 16

      const m = data.metrics
      const summaryCards: Array<[string, string]> = [
        ['Registros', String(m.total_attendance_records ?? 0)],
        ['Incidentes', String(m.total_late_incidents ?? 0)],
        ['Con tardanza', `${m.employees_with_late ?? 0} / ${m.active_employees ?? 0}`],
      ]
      const cardGap = 10
      const cardW = Math.floor((innerW() - cardGap * 2) / 3)
      summaryCards.forEach(([label, val], i) => {
        const x = left() + i * (cardW + cardGap)
        doc.roundedRect(x, y, cardW, 42, 8).fillAndStroke(PDF.panelBg, PDF.panelBorder)
        doc.font('Helvetica').fontSize(7).fillColor(PDF.bodyMuted)
        absText(doc, label.toUpperCase(), x + 10, y + 8, { width: cardW - 20 })
        doc.font('Helvetica-Bold').fontSize(14).fillColor(PDF.accentDark)
        absText(doc, val, x + 10, y + 20, { width: cardW - 20 })
      })
      y += 56

      if (!hasLate) {
        doc.roundedRect(left(), y, innerW(), 36, 8).fillAndStroke(PDF.successBg, PDF.successBorder)
        doc.font('Helvetica-Bold').fontSize(10).fillColor(PDF.successText)
        absText(doc, '¡Felicitaciones! 0 llegadas tarde en este periodo.', left() + 12, y + 12, {
          width: innerW() - 24,
        })
      } else {
        drawLiquidSectionTitle(doc, 'Ranking por empleado', left(), y)
        y += 14

        const empHeaders = ['Código', 'Empleado', 'Departamento', 'Días tarde', 'Promedio/día']
        const empWidths = [48, 148, 100, 55, 68]
        const empTableW = empWidths.reduce((a, b) => a + b, 0)
        const empRowH = 16
        const empHeaderH = 18

        const ensureSpace = (needed: number): boolean => {
          if (y + needed <= bottomSafe()) return false
          doc.addPage()
          y = doc.page.margins.top
          return true
        }

        const drawEmpHeader = (rowY: number) => {
          drawLiquidTableHeader(doc, left(), rowY, empWidths, empHeaders, empHeaderH, {
            fontSize: 7,
            padX: 3,
          })
        }

        ensureSpace(empHeaderH + empRowH)
        drawEmpHeader(y)
        y += empHeaderH

        data.employees.forEach((emp, idx) => {
          if (ensureSpace(empRowH)) {
            drawEmpHeader(y)
            y += empHeaderH
          }
          drawLiquidTableRowBackground(doc, left(), y, empTableW, empRowH, idx)
          strokeLiquidTableCells(doc, left(), y, empWidths, empRowH)

          const cells = [
            emp.employee_code ?? '—',
            emp.employee_name,
            emp.department_name ?? '—',
            String(emp.late_days),
            formatLateMinutes(Number(emp.avg_late_minutes)),
          ]
          let x = left()
          cells.forEach((cell, i) => {
            const w = empWidths[i]
            const align = i >= 3 ? 'center' : 'left'
            doc.fillColor(PDF.bodyText).font('Helvetica').fontSize(7)
            absText(doc, cell, x + 3, y + 4, { width: w - 6, align })
            x += w
          })
          y += empRowH
        })

        y += 18
        ensureSpace(40)
        drawLiquidSectionTitle(doc, 'Detalle por fecha', left(), y)
        y += 14

        const detHeaders = ['Fecha', 'Empleado', 'Esperada', 'Entrada', 'Min. tarde']
        const detWidths = [58, 168, 55, 55, 55]
        const detTableW = detWidths.reduce((a, b) => a + b, 0)
        const detRowH = 15
        const detHeaderH = 18

        const drawDetHeader = (rowY: number) => {
          drawLiquidTableHeader(doc, left(), rowY, detWidths, detHeaders, detHeaderH, {
            fontSize: 7,
            padX: 2,
          })
        }

        ensureSpace(detHeaderH + detRowH)
        drawDetHeader(y)
        y += detHeaderH

        data.details.forEach((row, idx) => {
          if (ensureSpace(detRowH)) {
            drawDetHeader(y)
            y += detHeaderH
          }
          drawLiquidTableRowBackground(doc, left(), y, detTableW, detRowH, idx)
          strokeLiquidTableCells(doc, left(), y, detWidths, detRowH)

          const cells = [
            formatDateOnlyForLocale(row.record_date, locale, tz),
            row.employee_name,
            row.expected_start ?? '—',
            row.check_in ?? '—',
            String(Math.round(Number(row.late_minutes) || 0)),
          ]
          let x = left()
          cells.forEach((cell, i) => {
            const w = detWidths[i]
            const align = i >= 2 ? 'center' : 'left'
            doc.fillColor(PDF.bodyText).font('Helvetica').fontSize(7)
            absText(doc, cell, x + 2, y + 3, { width: w - 4, align })
            x += w
          })
          y += detRowH
        })
      }

      doc.end()
    } catch (e) {
      reject(e)
    }
  })
}
