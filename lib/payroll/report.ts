import { Buffer } from 'buffer'
import { normalizeCountryCode } from '../country/supported'
import { statutoryDeductionLabels } from '../country/payroll-labels'
import { formatDateForHonduras, nowInHonduras, formatDateTimeForHonduras } from '../timezone'
import { formatPeriodRangeForDisplay } from './period-dates'
import { resolveStatutoryDeductionColumns } from './statutory-deduction-columns'
import {
  type PayrollPdfGroupBy,
  executiveBreakdownLabel,
  groupKeyForRow,
  groupPlanillaLikeRows
} from './pdf-layout'
import { defaultPdfPrimaryColor, PDF } from '../pdf/liquid-theme'

export interface PlanillaItem {
  id: string
  name: string
  bank: string
  bank_account: string
  department: string
  /** Equipo (campo employees.team) */
  team?: string | null
  /** Puesto formal */
  position?: string | null
  /** Rol / título alternativo (respaldo para agrupar por posición) */
  role?: string | null
  monthly_salary: number
  days_worked: number
  days_absent: number
  late_days: number
  total_earnings: number
  IHSS: number
  RAP: number
  ISR: number
  total_deductions: number
  total: number
  notes_on_ingress?: string
  notes_on_deductions?: string
  metadata?: Record<string, any> // Custom fields metadata
  pay_type?: 'fixed' | 'hourly'
  total_hours_worked?: number
  hourly_rate?: number
  septimo_dia?: number
}

/**
 * Custom field definition from payroll config
 */
interface CustomFieldDef {
  label: string
  type: 'number' | 'string' | 'boolean'
  category: 'earnings' | 'deductions' | 'calculation_helper'
  required: boolean
  default: any
}

/**
 * Generates a consolidated payroll PDF (3 pages: executive summary, payroll tables (fixed & hourly), bank details)
 * Returns a Buffer that can be sent as application/pdf
 * 
 * NEW: Supports separate tables for fixed and hourly employees, matching frontend display
 * NEW: Supports dynamic columns for custom fields based on payroll configuration
 */
export async function generateConsolidatedPayrollPDF(
  planillaFixed: PlanillaItem[],
  planillaHourly: PlanillaItem[],
  periodo: string,
  quincena: number,
  generatedByEmail?: string,
  companyName?: string,
  customFieldsConfig?: Record<string, CustomFieldDef | string>,
  payrollConfig?: {
    currency?: string
    payment_frequency?: string
    payment_cut_dates?: {
      biweekly_type?: string
      biweekly_first_start?: number
      biweekly_first_end?: number
      biweekly_second_start?: number
      biweekly_second_end?: number
      monthly_type?: string
      monthly_start?: number
      monthly_end?: number
    }
    legal_deductions?: { ihss?: boolean; rap?: boolean; isr?: boolean }
    /** ISO 3166-1 alpha-3 — etiquetas de deducciones (IHSS/ISSS/IGSS, etc.) */
    country_code?: string
  },
  periodDates?: { period_start: string; period_end: string },
  reportVisual?: { primaryColor?: string },
  layout?: { groupBy: PayrollPdfGroupBy; watermarkText?: string }
): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    try {
      const PDFDocument = require('pdfkit')
      const pdfGroupBy: PayrollPdfGroupBy = layout?.groupBy ?? 'none'
      const watermarkText = layout?.watermarkText?.trim() || ''

      const headerPrimary =
        defaultPdfPrimaryColor(reportVisual?.primaryColor)
      
      // Configuración de payroll con valores por defecto
      const currency = payrollConfig?.currency || 'HNL'
      const paymentFrequency = payrollConfig?.payment_frequency || 'biweekly'
      const paymentCutDates = payrollConfig?.payment_cut_dates || {
        biweekly_type: 'standard',
        biweekly_first_start: 1,
        biweekly_first_end: 15,
        biweekly_second_start: 16,
        biweekly_second_end: 30,
        monthly_type: 'standard',
        monthly_start: 1,
        monthly_end: 30
      }
      
      const pdfText = (v: unknown) => (v == null ? '' : String(v))

      const jurisdictionCountry = normalizeCountryCode(payrollConfig?.country_code)
      const dedLabels = statutoryDeductionLabels(jurisdictionCountry)

      // Formateo dinámico de currency
      const formatCurrency = (n: number) => {
        const formatted = Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        if (currency === 'USD') {
          return `$${formatted}`
        }
        if (currency === 'GTQ') {
          return `Q ${formatted}`
        }
        return `L. ${formatted}`
      }
      
      // Título dinámico según payment_frequency
      const payrollTitle = paymentFrequency === 'monthly' ? 'Planilla Mensual' : paymentFrequency === 'weekly' ? 'Planilla Semanal' : 'Planilla Quincenal'
      const payrollSubject = paymentFrequency === 'monthly' ? 'Nómina Mensual' : paymentFrequency === 'weekly' ? 'Nómina Semanal' : 'Nómina Quincenal'

      // Rango de fechas dinámico para header (ej: "15 de Oct al 21 de Oct")
      const periodRangeDisplay = periodDates
        ? formatPeriodRangeForDisplay(periodDates.period_start, periodDates.period_end)
        : null

      // Calcular texto de quincena/período según configuración (para sección info)
      let quincenaText = ''
      if (paymentFrequency === 'monthly') {
        const monthlyType = paymentCutDates?.monthly_type || 'standard'
        if (monthlyType === 'custom' && paymentCutDates?.monthly_start && paymentCutDates?.monthly_end) {
          quincenaText = `Mensual (${paymentCutDates.monthly_start}-${paymentCutDates.monthly_end})`
        } else {
          quincenaText = 'Mensual (1-fin de mes)'
        }
      } else if (paymentFrequency === 'weekly') {
        quincenaText = periodRangeDisplay || `Semana ${quincena}`
      } else {
        const biweeklyType = paymentCutDates?.biweekly_type || 'standard'
        if (biweeklyType === 'custom' && paymentCutDates?.biweekly_first_start && paymentCutDates?.biweekly_first_end &&
            paymentCutDates?.biweekly_second_start && paymentCutDates?.biweekly_second_end) {
          if (quincena === 1) {
            quincenaText = `Primera (${paymentCutDates.biweekly_first_start}-${paymentCutDates.biweekly_first_end})`
          } else {
            quincenaText = `Segunda (${paymentCutDates.biweekly_second_start}-${paymentCutDates.biweekly_second_end})`
          }
        } else {
          quincenaText = quincena === 1 ? 'Primera (1-15)' : 'Segunda (16-fin de mes)'
        }
      }
      
      const headerSubtitle = periodRangeDisplay ?? (paymentFrequency === 'monthly' ? periodo : `${periodo} • Quincena ${quincena}`)
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 30,
        info: {
          Title: `${payrollTitle} - ${headerSubtitle}`,
          Author: 'Sistema Hondureño de Recursos Humanos',
          Subject: payrollSubject,
          Keywords: 'nómina, planilla, Paragon, Honduras',
          Creator: 'HR SaaS System'
        }
      })

      const buffers: Buffer[] = []
      doc.on('error', (err: Error) => reject(err))
      doc.on('data', (chunk: Buffer) => buffers.push(chunk))
      doc.on('end', () => {
        try {
          const pdf = Buffer.concat(buffers)
          resolve(pdf)
        } catch (e) {
          reject(e)
        }
      })

      const drawWatermark = () => {
        if (!watermarkText) return
        const { width, height } = doc.page
        doc.save()
        doc.opacity(0.12)
        doc.fillColor('#dc2626')
        doc.fontSize(42)
        doc.rotate(-35, { origin: [width / 2, height / 2] })
        doc.text(watermarkText, 0, height / 2 - 20, {
          align: 'center',
          width,
        })
        doc.restore()
        doc.opacity(1)
      }

      if (watermarkText) {
        doc.on('pageAdded', () => drawWatermark())
        drawWatermark()
      }

      // ===== PAGE 1: HEADER & EXEC SUMMARY =====
      const pageWidth = doc.page.width
      doc.rect(0, 0, pageWidth, 90).fill(headerPrimary)
      doc.fillColor('white')
      doc.fontSize(22).text(companyName || 'SISTEMA HONDUREÑO DE RECURSOS HUMANOS', 30, 20, { align: 'center', width: pageWidth - 60 })
      doc.fontSize(13).text(payrollTitle, 30, 46, { align: 'center', width: pageWidth - 60 })
      doc.fontSize(12).text(headerSubtitle, 30, 66, { align: 'center', width: pageWidth - 60 })

      // Body base styles
      doc.fillColor('#0f172a')
      doc.fontSize(11).text('INFORMACIÓN DEL PERÍODO:', 30, 110)
      doc.fontSize(10).text(`Período: ${periodo}`, 30, 126)
      doc.fontSize(10).text(`Rango: ${periodRangeDisplay ?? quincenaText}`, 30, 142)
      doc.fontSize(10).text(`Fecha de generación: ${formatDateForHonduras(nowInHonduras())}`, 30, 158)
      if (generatedByEmail) {
        doc.fontSize(10).text(`Generado por: ${generatedByEmail}`, 30, 174)
      }

      // Combine both arrays for totals
      const planillaAll = [...planillaFixed, ...planillaHourly]
      const totalGross = planillaAll.reduce((sum, row) => sum + row.total_earnings, 0)
      const totalDeductions = planillaAll.reduce((sum, row) => sum + row.total_deductions, 0)
      const totalNet = planillaAll.reduce((sum, row) => sum + row.total, 0)
      const totalEmployees = planillaAll.length
      const totalFixed = planillaFixed.length
      const totalHourly = planillaHourly.length

      doc.rect(30, 200, pageWidth - 60, 110).stroke()
      doc.fontSize(12).text('RESUMEN EJECUTIVO', 40, 210)
      doc.fontSize(9).text('Total Empleados:', 45, 232)
      doc.fontSize(9).text(`${totalEmployees} (${totalFixed} fijos, ${totalHourly} por hora)`, 200, 232)
      doc.fontSize(9).text('Total Salario Bruto:', 45, 248)
      doc.fontSize(9).text(formatCurrency(totalGross), 200, 248)
      doc.fontSize(9).text('Total Deducciones:', 45, 264)
      doc.fontSize(9).text(formatCurrency(totalDeductions), 200, 264)
      doc.fontSize(9).text('Total Salario Neto:', 45, 280)
      doc.fontSize(9).text(formatCurrency(totalNet), 200, 280)

      const deptTotals: { [key: string]: { count: number, gross: number, net: number } } = {}
      const breakdownKey = pdfGroupBy === 'none' ? 'department' : pdfGroupBy
      planillaAll.forEach((row) => {
        const key =
          breakdownKey === 'department'
            ? row.department || 'Sin Departamento'
            : groupKeyForRow(row, breakdownKey)
        if (!deptTotals[key]) {
          deptTotals[key] = { count: 0, gross: 0, net: 0 }
        }
        deptTotals[key].count++
        deptTotals[key].gross += row.total_earnings
        deptTotals[key].net += row.total
      })
      doc.fontSize(9).text(executiveBreakdownLabel(pdfGroupBy === 'none' ? 'department' : pdfGroupBy), 360, 232)
      let deptY = 245
      Object.entries(deptTotals).forEach(([dept, totals]) => {
        if (deptY < 290) {
          doc.fontSize(8).text(`${dept}: ${totals.count} emp. - ${formatCurrency(totals.net)}`, 360, deptY)
          deptY += 11
        }
      })

      // Helper to get custom field value from metadata
      const getCustomFieldValue = (row: PlanillaItem, fieldName: string): string => {
        if (!row.metadata || !row.metadata[fieldName]) {
          return formatCurrency(0)
        }
        const value = row.metadata[fieldName]
        if (typeof value === 'number') {
          return formatCurrency(value)
        } else if (typeof value === 'boolean') {
          return value ? 'Sí' : 'No'
        }
        return String(value || '')
      }

      const sectionBannerLabel = (groupBy: PayrollPdfGroupBy, gkey: string): string => {
        if (groupBy === 'department') return `Departamento: ${gkey}`
        if (groupBy === 'team') return `Equipo: ${gkey}`
        return `Posición: ${gkey}`
      }

      // Helper function to draw a payroll table (single block or grouped segments)
      const drawPayrollTable = (
        planillaData: PlanillaItem[],
        title: string,
        isHourly: boolean = false
      ) => {
        if (planillaData.length === 0) return

        const segments = groupPlanillaLikeRows(planillaData, pdfGroupBy)

        doc.addPage()
        const tablePageWidth = doc.page.width
        doc.fontSize(11).fillColor('#0f172a').text(title, 30, 24, { align: 'center', width: tablePageWidth - 60 })

        const hasSeptimoDia = isHourly && planillaData.some((r) => (r.septimo_dia ?? 0) > 0)
        let baseHeaders: string[]
        if (isHourly) {
          baseHeaders = hasSeptimoDia
            ? ['Código', 'Nombre', 'Departamento', 'Días', 'Horas', 'Tarifa/Hora', 'Salario Base', 'Séptimo Día']
            : ['Código', 'Nombre', 'Departamento', 'Días', 'Horas', 'Tarifa/Hora', 'Salario Base']
        } else {
          baseHeaders = ['Código', 'Nombre', 'Departamento', 'Días Trab.', 'Salario Base Mensual']
        }

        const statutoryCols = resolveStatutoryDeductionColumns(
          payrollConfig?.legal_deductions,
          customFieldsConfig as Record<string, CustomFieldDef | string> | undefined,
          jurisdictionCountry
        )

        const earningsHeaders: string[] = []
        const deductionsHeaders: string[] = []
        const standardDeductionsHeaders: string[] = []
        if (statutoryCols.ihss) standardDeductionsHeaders.push(dedLabels.primarySocial)
        if (statutoryCols.rap && dedLabels.secondarySocial !== '—') {
          standardDeductionsHeaders.push(dedLabels.secondarySocial)
        }
        if (statutoryCols.isr) standardDeductionsHeaders.push(dedLabels.incomeTax)
        const finalHeaders = ['Devengado', 'Deducciones', 'Neto']

        if (customFieldsConfig) {
          for (const [fieldName, fieldDef] of Object.entries(customFieldsConfig)) {
            const def =
              typeof fieldDef === 'string'
                ? {
                    label: fieldDef,
                    category: 'earnings' as const,
                    type: 'number' as const,
                    required: false,
                    default: 0
                  }
                : fieldDef

            if (def.category === 'earnings') {
              earningsHeaders.push(def.label || fieldName)
            } else if (def.category === 'deductions') {
              deductionsHeaders.push(def.label || fieldName)
            }
          }
        }

        const allHeaders = [
          ...baseHeaders,
          ...earningsHeaders,
          ...finalHeaders.slice(0, 1),
          ...standardDeductionsHeaders,
          ...deductionsHeaders,
          ...finalHeaders.slice(1)
        ]

        const baseColWidths = isHourly
          ? hasSeptimoDia
            ? [55, 110, 70, 35, 45, 55, 65, 55]
            : [60, 115, 75, 40, 50, 60, 70]
          : [60, 118, 75, 50, 80]
        const customFieldWidth = 50
        const earningsColWidths = earningsHeaders.map(() => customFieldWidth)
        const devengadoWidth = 65
        const standardDeductionsWidths = standardDeductionsHeaders.map(() => 45)
        const deductionsColWidths = deductionsHeaders.map(() => customFieldWidth)
        const finalColWidths = [65, 65]

        const colWidths = [
          ...baseColWidths,
          ...earningsColWidths,
          devengadoWidth,
          ...standardDeductionsWidths,
          ...deductionsColWidths,
          ...finalColWidths
        ]

        const totalWidth = colWidths.reduce((a, b) => a + b, 0)
        const availableWidth = tablePageWidth - 80
        if (totalWidth > availableWidth) {
          const scaleFactor = availableWidth / totalWidth
          for (let i = 0; i < colWidths.length; i++) {
            colWidths[i] = Math.floor(colWidths[i] * scaleFactor)
          }
        }

        const startX = 40
        const rowHeight = 15

        const headerTextOpts = (i: number) => ({
          width: colWidths[i] - 4,
          align: 'center' as const,
          lineBreak: false,
          ellipsis: true
        })

        const paintHeaderRow = (y: number): number => {
          allHeaders.forEach((h, i) => {
            const x = startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0)
            doc.rect(x, y, colWidths[i], rowHeight).fillAndStroke(headerPrimary, '#0f172a')
            doc.fillColor('white')
            doc.fontSize(7).text(h, x + 2, y + 3, headerTextOpts(i))
            doc.fillColor('#0f172a')
          })
          return y + rowHeight
        }

        const paintTotalsRow = (rows: PlanillaItem[], y: number): number => {
          const y2 = y + 4
          const totalsWidth = colWidths.reduce((a, b) => a + b, 0)
          const tableTotalGross = rows.reduce((sum, row) => sum + row.total_earnings, 0)
          const tableTotalDeductions = rows.reduce((sum, row) => sum + row.total_deductions, 0)
          const tableTotalNet = rows.reduce((sum, row) => sum + row.total, 0)
          doc.rect(startX, y2, totalsWidth, rowHeight).fillAndStroke('#f3f4f6', '#0f172a')
          doc.fontSize(8).fillColor('#0f172a').text('TOTALES:', startX + 4, y2 + 4)
          doc.fontSize(8).text(formatCurrency(tableTotalGross), startX + totalsWidth * 0.45, y2 + 4)
          doc.fontSize(8).text(formatCurrency(tableTotalDeductions), startX + totalsWidth * 0.65, y2 + 4)
          doc.fontSize(8).text(formatCurrency(tableTotalNet), startX + totalsWidth * 0.82, y2 + 4)
          return y2 + rowHeight
        }

        const paintDataRows = (rows: PlanillaItem[], yStart: number, continuationLabel: string): number => {
          let y = yStart
          let pageCount = 1
          for (const row of rows) {
            if (y > doc.page.height - 60) {
              doc.addPage()
              y = 40
              pageCount++
              doc.fontSize(8).fillColor('#475569').text(`${continuationLabel} - Página ${pageCount}`, 40, 20)
              y = paintHeaderRow(y)
            }

            const values: string[] = []

            if (isHourly) {
              values.push(
                row.id || '',
                row.name || '',
                (row.department || '').substring(0, 18),
                row.days_worked.toFixed(1),
                (row.total_hours_worked || 0).toFixed(2),
                formatCurrency(row.hourly_rate || 0),
                formatCurrency(row.monthly_salary)
              )
              if (hasSeptimoDia) {
                values.push(formatCurrency(row.septimo_dia ?? 0))
              }
            } else {
              values.push(
                row.id || '',
                row.name || '',
                (row.department || '').substring(0, 18),
                row.days_worked.toFixed(1),
                formatCurrency(row.monthly_salary)
              )
            }

            if (customFieldsConfig) {
              for (const [fieldName, fieldDef] of Object.entries(customFieldsConfig)) {
                const def =
                  typeof fieldDef === 'string'
                    ? {
                        label: fieldDef,
                        category: 'earnings' as const,
                        type: 'number' as const,
                        required: false,
                        default: 0
                      }
                    : fieldDef
                if (def.category === 'earnings') {
                  values.push(getCustomFieldValue(row, fieldName))
                }
              }
            }

            values.push(formatCurrency(row.total_earnings))

            if (statutoryCols.ihss) values.push(formatCurrency(row.IHSS))
            if (statutoryCols.rap) values.push(formatCurrency(row.RAP))
            if (statutoryCols.isr) values.push(formatCurrency(row.ISR))

            if (customFieldsConfig) {
              for (const [fieldName, fieldDef] of Object.entries(customFieldsConfig)) {
                const def =
                  typeof fieldDef === 'string'
                    ? {
                        label: fieldDef,
                        category: 'deductions' as const,
                        type: 'number' as const,
                        required: false,
                        default: 0
                      }
                    : fieldDef
                if (def.category === 'deductions') {
                  values.push(getCustomFieldValue(row, fieldName))
                }
              }
            }

            values.push(formatCurrency(row.total_deductions))
            values.push(formatCurrency(row.total))

            const cellOpts = (i: number) => ({
              width: colWidths[i] - 4,
              align: 'center' as const,
              lineBreak: false,
              ellipsis: true
            })
            values.forEach((val, i) => {
              const x = startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0)
              doc.rect(x, y, colWidths[i], rowHeight).stroke()
              doc.fontSize(7).fillColor('#0f172a').text(pdfText(val), x + 2, y + 3, cellOpts(i))
            })
            y += rowHeight
          }
          return y
        }

        let y = 50
        for (const [gkey, grows] of segments) {
          const sectionH = pdfGroupBy !== 'none' ? 24 : 0
          if (y + sectionH + rowHeight + 30 > doc.page.height - 60) {
            doc.addPage()
            y = 40
            doc.fontSize(8).fillColor('#475569').text(`${title} (continuación)`, 40, 20)
            y = 52
          }

          if (pdfGroupBy !== 'none' && gkey !== '') {
            doc.rect(40, y, tablePageWidth - 80, 18).fill('#e2e8f0')
            doc.fillColor('#0f172a')
            doc.fontSize(9).text(sectionBannerLabel(pdfGroupBy, gkey), 48, y + 5, {
              width: tablePageWidth - 100
            })
            y += 22
          }

          y = paintHeaderRow(y)
          const continuationLabel =
            pdfGroupBy !== 'none' && gkey !== '' ? `${title} — ${gkey}` : title
          y = paintDataRows(grows, y, continuationLabel)
          y = paintTotalsRow(grows, y)
          y += 12
        }
      }

      // Draw Fixed Employees Table
      if (planillaFixed.length > 0) {
        drawPayrollTable(planillaFixed, 'NÓMINA — EMPLEADOS FIJOS', false)
      }

      // Draw Hourly Employees Table
      if (planillaHourly.length > 0) {
        drawPayrollTable(planillaHourly, 'NÓMINA — EMPLEADOS POR HORA', true)
      }

      // ===== PAGE 3: BANK DETAILS & NOTES =====
      doc.addPage()
      const bankPageWidth = doc.page.width
      doc.fontSize(14).fillColor('#0f172a').text('INFORMACIÓN BANCARIA Y NOTAS', 30, 24, { align: 'center', width: bankPageWidth - 60 })

      doc.fontSize(9).text('DETALLE BANCARIO PARA TRANSFERENCIAS:', 30, 60)
      const bankHeaders = ['Código', 'Nombre', 'Banco', 'Cuenta', 'Monto Neto']
      const bankColWidths = [70, 210, 120, 180, 120]
      const bankStartX = 40
      let bankY = 60
      const bankRowHeight = 17

      bankHeaders.forEach((h, i) => {
        const x = bankStartX + bankColWidths.slice(0, i).reduce((a, b) => a + b, 0)
        doc.rect(x, bankY, bankColWidths[i], bankRowHeight).fillAndStroke(headerPrimary, '#0f172a')
        doc.fillColor('white')
        doc.fontSize(8).text(h, x + 2, bankY + 4, { width: bankColWidths[i] - 4, align: 'center' })
        doc.fillColor('#0f172a')
      })
      bankY += bankRowHeight

      planillaAll.forEach((row) => {
        if (bankY > doc.page.height - 60) {
          doc.addPage()
          bankY = 40
        }
        const bankValues = [
          row.id || '',
          row.name,
          row.bank || 'No especificado',
          row.bank_account || 'No especificado',
          formatCurrency(row.total)
        ]
        bankValues.forEach((val, i) => {
          const x = bankStartX + bankColWidths.slice(0, i).reduce((a, b) => a + b, 0)
          doc.rect(x, bankY, bankColWidths[i], bankRowHeight).stroke()
          doc.fontSize(8).fillColor('#0f172a').text(pdfText(val), x + 2, bankY + 4, {
            width: bankColWidths[i] - 4,
            align: 'center',
            lineBreak: false,
            ellipsis: true
          })
        })
        bankY += bankRowHeight
      })

      doc.fontSize(9).fillColor('#0f172a').text('NOTAS IMPORTANTES:', 40, bankY + 22)
      doc.fontSize(8).fillColor('#334155').text('• Esta planilla ha sido generada automáticamente por el Sistema Hondureño de Recursos Humanos.', 40, bankY + 38)
      doc.fontSize(8).text('• Los montos están calculados según la legislación laboral de Honduras.', 40, bankY + 53)
      const dedLegend =
        dedLabels.secondarySocial === '—'
          ? `${dedLabels.primarySocial}, ${dedLabels.incomeTax}`
          : `${dedLabels.primarySocial}, ${dedLabels.secondarySocial}, ${dedLabels.incomeTax}`
      doc
        .fontSize(8)
        .text(
          `• Las deducciones incluyen las aplicables según configuración (${dedLegend} u otras).`,
          40,
          bankY + 68
        )
      doc.fontSize(8).text('• Verificar que la información bancaria sea correcta antes de procesar pagos.', 40, bankY + 83)
      doc.fontSize(8).text('• Para consultas, contactar al departamento de recursos humanos.', 40, bankY + 98)

      doc.fontSize(8).fillColor('#64748b').text('SISU: Sistema Hondureño de Recursos Humanos', 40, doc.page.height - 35, { align: 'center', width: bankPageWidth - 80 })
      doc.fontSize(8).text(`Fecha de generación: ${formatDateTimeForHonduras(nowInHonduras())}`, 40, doc.page.height - 20, { align: 'center', width: bankPageWidth - 80 })

      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}

