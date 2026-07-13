import { Buffer } from 'buffer'
import { normalizeCountryCode } from '../country/supported'
import { statutoryDeductionLabels } from '../country/payroll-labels'
import { formatDateForHonduras, nowInHonduras, formatDateTimeForHonduras } from '../timezone'
import { formatPeriodRangeForDisplay } from './period-dates'
import { resolveStatutoryDeductionColumns } from './statutory-deduction-columns'
import { formatVoucherCompanyName } from './voucher-pdf-options'
import type { BrandingConfig } from '../reports/report-config-schema'
import { resolveCompanyLogoBuffer } from '../reports/resolve-company-logo'
import {
  type PayrollPdfGroupBy,
  executiveBreakdownLabel,
  groupKeyForRow,
  groupPlanillaLikeRows
} from './pdf-layout'
import {
  defaultPdfPrimaryColor,
  drawBrandedReceiptHeader,
  drawLiquidPanel,
  drawLiquidSectionTitle,
  drawLiquidTableHeader,
  drawLiquidTableRowBackground,
  PDF,
  PDF_FOOTER_RESERVE,
  registerLiquidPageFooter,
  strokeLiquidTableCells,
} from '../pdf/liquid-theme'

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
  reportVisual?: { primaryColor?: string; branding?: BrandingConfig },
  layout?: { groupBy: PayrollPdfGroupBy; watermarkText?: string }
): Promise<Buffer> {
  const headerPrimary = defaultPdfPrimaryColor(
    reportVisual?.primaryColor ?? reportVisual?.branding?.primaryColor
  )
  const logoBuffer = await resolveCompanyLogoBuffer(reportVisual?.branding)
  const displayCompanyName = formatVoucherCompanyName(
    reportVisual?.branding,
    companyName || 'SISTEMA HONDUREÑO DE RECURSOS HUMANOS'
  )
  const generatedAt = formatDateTimeForHonduras(nowInHonduras())

  return new Promise<Buffer>((resolve, reject) => {
    try {
      const PDFDocument = require('pdfkit')
      const pdfGroupBy: PayrollPdfGroupBy = layout?.groupBy ?? 'none'
      const watermarkText = layout?.watermarkText?.trim() || ''
      
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
          Author: displayCompanyName,
          Subject: payrollSubject,
          Keywords: 'nómina, planilla, Honduras, Humano SISU',
          Creator: 'Humano SISU'
        }
      })

      registerLiquidPageFooter(doc, { generatedAt })

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
        try {
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
        } catch (watermarkErr) {
          console.warn('payroll PDF watermark skipped:', watermarkErr)
        }
      }

      if (watermarkText) {
        doc.on('pageAdded', () => drawWatermark())
        drawWatermark()
      }

      // ===== PAGE 1: HEADER & EXEC SUMMARY =====
      const pageWidth = doc.page.width
      const margin = 30
      let bodyY = drawBrandedReceiptHeader(doc, {
        primaryColor: headerPrimary,
        companyName: displayCompanyName,
        title: payrollTitle,
        subtitle: headerSubtitle,
        logoBuffer,
      })

      drawLiquidSectionTitle(doc, 'Información del período', margin, bodyY)
      doc.font('Helvetica').fontSize(10).fillColor(PDF.bodyMuted).text(`Período: ${periodo}`, margin, bodyY + 16)
      doc.fontSize(10).text(`Rango: ${periodRangeDisplay ?? quincenaText}`, margin, bodyY + 32)
      doc.fontSize(10).text(`Fecha de generación: ${formatDateForHonduras(nowInHonduras())}`, margin, bodyY + 48)
      if (generatedByEmail) {
        doc.fontSize(10).text(`Generado por: ${generatedByEmail}`, margin, bodyY + 64)
      }

      const planillaAll = [...planillaFixed, ...planillaHourly]
      const totalGross = planillaAll.reduce((sum, row) => sum + row.total_earnings, 0)
      const totalDeductions = planillaAll.reduce((sum, row) => sum + row.total_deductions, 0)
      const totalNet = planillaAll.reduce((sum, row) => sum + row.total, 0)
      const totalEmployees = planillaAll.length
      const totalFixed = planillaFixed.length
      const totalHourly = planillaHourly.length

      const summaryTop = bodyY + 88
      const summaryBoxH = 110
      drawLiquidPanel(doc, margin, summaryTop, pageWidth - margin * 2, summaryBoxH)
      drawLiquidSectionTitle(doc, 'Resumen ejecutivo', margin + 8, summaryTop + 8)
      doc.font('Helvetica').fontSize(9).fillColor(PDF.bodyMuted).text('Total Empleados:', margin + 14, summaryTop + 30)
      doc.fontSize(9).fillColor(PDF.bodyText).text(`${totalEmployees} (${totalFixed} fijos, ${totalHourly} por hora)`, 200, summaryTop + 30)
      doc.fontSize(9).fillColor(PDF.bodyMuted).text('Total Salario Bruto:', margin + 14, summaryTop + 46)
      doc.fontSize(9).fillColor(PDF.bodyText).text(formatCurrency(totalGross), 200, summaryTop + 46)
      doc.fontSize(9).fillColor(PDF.bodyMuted).text('Total Deducciones:', margin + 14, summaryTop + 62)
      doc.fontSize(9).fillColor(PDF.bodyText).text(formatCurrency(totalDeductions), 200, summaryTop + 62)
      doc.fontSize(9).fillColor(PDF.bodyMuted).text('Total Salario Neto:', margin + 14, summaryTop + 78)
      doc.fontSize(9).fillColor(PDF.bodyText).text(formatCurrency(totalNet), 200, summaryTop + 78)

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
      doc.fontSize(9).fillColor(PDF.bodyMuted).text(
        executiveBreakdownLabel(pdfGroupBy === 'none' ? 'department' : pdfGroupBy),
        360,
        summaryTop + 30
      )
      let deptY = summaryTop + 44
      Object.entries(deptTotals).forEach(([dept, totals]) => {
        if (deptY < summaryTop + 92) {
          doc.font('Helvetica').fontSize(8).fillColor(PDF.bodyText).text(
            `${dept}: ${totals.count} emp. - ${formatCurrency(totals.net)}`,
            360,
            deptY
          )
          deptY += 11
        }
      })

      // Helper to get custom field value from metadata
      const getCustomFieldNumber = (row: PlanillaItem, fieldName: string): number => {
        if (!row.metadata || row.metadata[fieldName] == null) return 0
        const value = row.metadata[fieldName]
        if (typeof value === 'number') return Number.isFinite(value) ? value : 0
        if (typeof value === 'boolean') return value ? 1 : 0
        const n = Number(value)
        return Number.isFinite(n) ? n : 0
      }

      const getCustomFieldValue = (row: PlanillaItem, fieldName: string): string => {
        if (!row.metadata || row.metadata[fieldName] == null || row.metadata[fieldName] === '') {
          return formatCurrency(0)
        }
        const value = row.metadata[fieldName]
        if (typeof value === 'number') {
          return formatCurrency(value)
        } else if (typeof value === 'boolean') {
          return value ? 'Sí' : 'No'
        }
        const asNum = Number(value)
        if (Number.isFinite(asNum) && String(value).trim() !== '') {
          return formatCurrency(asNum)
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
        drawLiquidSectionTitle(doc, title, 30, 24)

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
        const customFieldWidth = 42
        const earningsColWidths = earningsHeaders.map(() => customFieldWidth)
        const devengadoWidth = 58
        const standardDeductionsWidths = standardDeductionsHeaders.map(() => 38)
        const deductionsColWidths = deductionsHeaders.map(() => customFieldWidth)
        const finalColWidths = [58, 58]

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
          // Prefer shrinking numeric/custom columns so Código/Nombre stay readable on one line.
          const protectedSum = colWidths[0] + colWidths[1]
          const restSum = totalWidth - protectedSum
          const restAvailable = availableWidth - protectedSum
          if (restAvailable > 80 && restSum > 0) {
            const restScale = restAvailable / restSum
            for (let i = 2; i < colWidths.length; i++) {
              colWidths[i] = Math.max(28, Math.floor(colWidths[i] * restScale))
            }
            const after = colWidths.reduce((a, b) => a + b, 0)
            if (after > availableWidth) {
              const fix = availableWidth / after
              for (let i = 0; i < colWidths.length; i++) {
                colWidths[i] = Math.max(22, Math.floor(colWidths[i] * fix))
              }
            }
          } else {
            const scaleFactor = availableWidth / totalWidth
            for (let i = 0; i < colWidths.length; i++) {
              colWidths[i] = Math.max(22, Math.floor(colWidths[i] * scaleFactor))
            }
          }
        }

        const startX = 40
        const dataRowHeight = 12
        const headerRowHeight = 26
        const dataFontSize = 5.5
        const headerFontSize = 6
        const totalsFontSize = 5.5

        /** Text columns (no totals): Código, Nombre, Departamento */
        const textColCount = 3

        const buildRowValues = (row: PlanillaItem): string[] => {
          const values: string[] = []

          if (isHourly) {
            values.push(
              row.id || '',
              row.name || '',
              row.department || '',
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
              row.department || '',
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
          if (statutoryCols.rap && dedLabels.secondarySocial !== '—') {
            values.push(formatCurrency(row.RAP))
          }
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
          return values
        }

        /** Numeric contribution per column; null = text column (skip in totals). */
        const buildRowNumericContributions = (row: PlanillaItem): (number | null)[] => {
          const nums: (number | null)[] = []

          if (isHourly) {
            nums.push(null, null, null, row.days_worked, row.total_hours_worked || 0, row.hourly_rate || 0, row.monthly_salary)
            if (hasSeptimoDia) {
              nums.push(row.septimo_dia ?? 0)
            }
          } else {
            nums.push(null, null, null, row.days_worked, row.monthly_salary)
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
                nums.push(getCustomFieldNumber(row, fieldName))
              }
            }
          }

          nums.push(row.total_earnings)

          if (statutoryCols.ihss) nums.push(row.IHSS)
          if (statutoryCols.rap && dedLabels.secondarySocial !== '—') {
            nums.push(row.RAP)
          }
          if (statutoryCols.isr) nums.push(row.ISR)

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
                nums.push(getCustomFieldNumber(row, fieldName))
              }
            }
          }

          nums.push(row.total_deductions)
          nums.push(row.total)
          return nums
        }

        const formatTotalCell = (colIndex: number, sum: number): string => {
          // Días / Horas: plain number; Tarifa and money columns: currency
          if (isHourly) {
            if (colIndex === 3) return sum.toFixed(1) // Días
            if (colIndex === 4) return sum.toFixed(2) // Horas
          } else if (colIndex === 3) {
            return sum.toFixed(1) // Días Trab.
          }
          return formatCurrency(sum)
        }

        const paintHeaderRow = (y: number): number => {
          drawLiquidTableHeader(doc, startX, y, colWidths, allHeaders, headerRowHeight, {
            fontSize: headerFontSize,
            align: 'center',
            padX: 1,
          })
          return y + headerRowHeight
        }

        const paintTotalsRow = (rows: PlanillaItem[], y: number): number => {
          const y2 = y + 4
          const totalsWidth = colWidths.reduce((a, b) => a + b, 0)
          const sums = new Array(allHeaders.length).fill(0) as number[]
          const isNumeric = new Array(allHeaders.length).fill(false) as boolean[]

          for (const row of rows) {
            const contrib = buildRowNumericContributions(row)
            for (let i = 0; i < contrib.length; i++) {
              const v = contrib[i]
              if (v == null) continue
              isNumeric[i] = true
              sums[i] += v
            }
          }

          drawLiquidTableRowBackground(doc, startX, y2, totalsWidth, dataRowHeight, 0)
          strokeLiquidTableCells(doc, startX, y2, colWidths, dataRowHeight)

          for (let i = 0; i < allHeaders.length; i++) {
            const x = startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0)
            const cellW = colWidths[i] - 2
            if (i === 0) {
              doc
                .font('Helvetica-Bold')
                .fontSize(totalsFontSize)
                .fillColor(PDF.accentDark)
                .text('TOTALES:', x + 1, y2 + 3, {
                  width: cellW,
                  align: 'left',
                  lineBreak: false,
                  ellipsis: true,
                })
              continue
            }
            if (i < textColCount || !isNumeric[i]) {
              continue
            }
            doc
              .font('Helvetica-Bold')
              .fontSize(totalsFontSize)
              .fillColor(PDF.bodyText)
              .text(formatTotalCell(i, sums[i]), x + 1, y2 + 3, {
                width: cellW,
                align: 'center',
                lineBreak: false,
                ellipsis: true,
              })
          }
          return y2 + dataRowHeight
        }

        const paintDataRows = (rows: PlanillaItem[], yStart: number, continuationLabel: string): number => {
          let y = yStart
          let pageCount = 1
          let rowIndex = 0
          const bottomLimit = doc.page.height - 60 - PDF_FOOTER_RESERVE
          for (const row of rows) {
            if (y > bottomLimit) {
              doc.addPage()
              y = 40
              pageCount++
              doc.font('Helvetica').fontSize(8).fillColor(PDF.bodyMuted).text(`${continuationLabel} - Página ${pageCount}`, 40, 20)
              y = paintHeaderRow(y)
              rowIndex = 0
            }

            const values = buildRowValues(row)
            const cellOpts = (i: number) => ({
              width: colWidths[i] - 2,
              align: 'center' as const,
              lineBreak: false,
              ellipsis: true,
              height: dataRowHeight - 2,
            })
            const rowWidth = colWidths.reduce((a, b) => a + b, 0)
            drawLiquidTableRowBackground(doc, startX, y, rowWidth, dataRowHeight, rowIndex)
            strokeLiquidTableCells(doc, startX, y, colWidths, dataRowHeight)
            values.forEach((val, i) => {
              const x = startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0)
              doc
                .font('Helvetica')
                .fontSize(dataFontSize)
                .fillColor(PDF.bodyText)
                .text(pdfText(val), x + 1, y + 3, cellOpts(i))
            })
            y += dataRowHeight
            rowIndex += 1
          }
          return y
        }

        let y = 50
        for (const [gkey, grows] of segments) {
          const sectionH = pdfGroupBy !== 'none' ? 24 : 0
          if (y + sectionH + headerRowHeight + 30 > doc.page.height - 60) {
            doc.addPage()
            y = 40
            doc.fontSize(8).fillColor('#475569').text(`${title} (continuación)`, 40, 20)
            y = 52
          }

          if (pdfGroupBy !== 'none' && gkey !== '') {
            drawLiquidPanel(doc, 40, y, tablePageWidth - 80, 18, { fill: PDF.panelBgAlt, radius: 6 })
            doc.fillColor(PDF.accentDark)
            doc.font('Helvetica-Bold').fontSize(9).text(sectionBannerLabel(pdfGroupBy, gkey), 48, y + 5, {
              width: tablePageWidth - 100
            })
            doc.fillColor(PDF.bodyText).font('Helvetica')
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
      drawLiquidSectionTitle(doc, 'Información bancaria y notas', 30, 24)

      drawLiquidSectionTitle(doc, 'Detalle bancario para transferencias', 30, 52)
      const bankHeaders = ['Código', 'Nombre', 'Banco', 'Cuenta', 'Monto Neto']
      const bankColWidths = [70, 210, 120, 180, 120]
      const bankStartX = 40
      let bankY = 68
      const bankRowHeight = 17

      drawLiquidTableHeader(doc, bankStartX, bankY, bankColWidths, bankHeaders, bankRowHeight)
      bankY += bankRowHeight

      let bankRowIndex = 0
      planillaAll.forEach((row) => {
        if (bankY > doc.page.height - 60 - PDF_FOOTER_RESERVE) {
          doc.addPage()
          bankY = 40
          bankRowIndex = 0
        }
        const bankValues = [
          row.id || '',
          row.name,
          row.bank || 'No especificado',
          row.bank_account || 'No especificado',
          formatCurrency(row.total)
        ]
        const bankTableW = bankColWidths.reduce((a, b) => a + b, 0)
        drawLiquidTableRowBackground(doc, bankStartX, bankY, bankTableW, bankRowHeight, bankRowIndex)
        strokeLiquidTableCells(doc, bankStartX, bankY, bankColWidths, bankRowHeight)
        bankValues.forEach((val, i) => {
          const x = bankStartX + bankColWidths.slice(0, i).reduce((a, b) => a + b, 0)
          doc.font('Helvetica').fontSize(8).fillColor(PDF.bodyText).text(pdfText(val), x + 2, bankY + 4, {
            width: bankColWidths[i] - 4,
            align: 'center',
            lineBreak: false,
            ellipsis: true
          })
        })
        bankY += bankRowHeight
        bankRowIndex += 1
      })

      drawLiquidSectionTitle(doc, 'Notas importantes', 40, bankY + 22)
      doc.font('Helvetica').fontSize(8).fillColor(PDF.bodyMuted).text('• Esta planilla ha sido generada automáticamente por Humano SISU.', 40, bankY + 38)
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

      doc.end()
    } catch (error) {
      reject(
        error instanceof Error
          ? error
          : new Error(error != null ? String(error) : 'Error generando PDF de planilla')
      )
    }
  })
}

