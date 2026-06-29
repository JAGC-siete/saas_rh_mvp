import { Buffer } from 'buffer'
import { formatDateTimeForHonduras, nowInHonduras } from '../timezone'
import { formatPeriodRangeForDisplay } from './period-dates'
import {
  formatVoucherCompanyName,
  type VoucherPdfOptions,
} from './voucher-pdf-options'
import { resolveCompanyLogoBuffer } from '../reports/resolve-company-logo'
import { defaultPdfPrimaryColor, PDF } from '../pdf/liquid-theme'

export type { VoucherPdfOptions }

const PAGE_WIDTH = 595.28
/** A4 height — single page avoids PDFKit auto-pagination from underestimated dynamic height */
const PAGE_HEIGHT = 841.89
const MARGIN = 30
const FOOTER_BLOCK = 32
const LAYOUT_SAFETY_PADDING = 48

export interface EmployeeReceiptInput {
  employee_code?: string
  employee_name?: string
  department?: string
  position?: string
  period_start: string
  period_end: string
  days_worked: number
  base_salary: number
  income_tax: number
  professional_tax: number
  social_security: number
  total_deductions: number
  net_salary: number
  bank_name?: string
  bank_account?: string
  custom_deductions?: Array<{ name: string; amount: number }>
  /** Séptimo Día (Art. 338-340) - solo para hourly */
  septimo_dia?: number
}

function sectionVisible(id: string, options?: VoucherPdfOptions): boolean {
  if (!options?.visibleSections) return true
  return options.visibleSections.has(id)
}

/** Line items with amounts always appear on the receipt (config may hide the section label only). */
function shouldShowCustomDeductionLines(
  record: EmployeeReceiptInput,
  options?: VoucherPdfOptions
): boolean {
  if (!record.custom_deductions?.length) return false
  if (!options?.visibleSections) return true
  if (options.visibleSections.has('custom_deductions')) return true
  for (const id of options.visibleSections) {
    if (id.startsWith('custom_')) return true
  }
  return true
}

function fieldLabel(id: string, fallback: string, options?: VoucherPdfOptions): string {
  return options?.labels?.[id] ?? fallback
}

type ReceiptLayout = {
  headerHeight: number
  pageHeight: number
  footerY: number
  showEmployee: boolean
  employeeRowCount: number
  showEarnings: boolean
  hasSeptimoDia: boolean
  showBaseSalary: boolean
  showDeductions: boolean
  visibleStatutory: number
  customDeductionsCount: number
  showTotalDeductions: boolean
  showNet: boolean
  showBank: boolean
  showBankName: boolean
  showBankAccount: boolean
  showLegalNotes: boolean
  showSignatures: boolean
}

function buildReceiptLayout(
  record: EmployeeReceiptInput,
  options: VoucherPdfOptions | undefined,
  hasLogo: boolean
): ReceiptLayout {
  const headerHeight = hasLogo ? 72 : 60
  const showEmployee =
    sectionVisible('emp_code', options) ||
    sectionVisible('emp_name', options) ||
    sectionVisible('department', options) ||
    sectionVisible('position', options) ||
    sectionVisible('period', options) ||
    sectionVisible('days_worked', options)

  let employeeRowCount = 0
  if (sectionVisible('emp_code', options)) employeeRowCount += 1
  if (sectionVisible('emp_name', options)) employeeRowCount += 1
  if (sectionVisible('department', options)) employeeRowCount += 1
  if (sectionVisible('position', options)) employeeRowCount += 1
  if (sectionVisible('period', options)) employeeRowCount += 1
  if (sectionVisible('days_worked', options)) employeeRowCount += 1

  const hasSeptimoDia = (record.septimo_dia ?? 0) > 0 && sectionVisible('septimo_dia', options)
  const showBaseSalary = sectionVisible('base_salary', options)
  const showEarnings = showBaseSalary || hasSeptimoDia
  const showCustomDeductionLines = shouldShowCustomDeductionLines(record, options)
  const customDeductionsCount = showCustomDeductionLines ? record.custom_deductions?.length || 0 : 0
  const visibleStatutory =
    (sectionVisible('ihss', options) ? 1 : 0) +
    (sectionVisible('rap', options) ? 1 : 0) +
    (sectionVisible('isr', options) ? 1 : 0)
  const showTotalDeductions = sectionVisible('total_deductions', options)
  const showDeductions =
    visibleStatutory > 0 ||
    customDeductionsCount > 0 ||
    showTotalDeductions
  const showNet = sectionVisible('net_salary', options)
  const showBankName = sectionVisible('bank_name', options)
  const showBankAccount = sectionVisible('bank_account', options)
  const showBank = showBankName || showBankAccount
  const showLegalNotes = sectionVisible('legal_notes', options)
  const showSignatures = sectionVisible('signatures', options)

  let y = headerHeight + 20

  if (showEmployee) {
    const boxHeight = Math.max(50, 16 + employeeRowCount * 14)
    y += 18 + boxHeight + 10
  }
  if (showEarnings) {
    const earningsHeight = 20 + (showBaseSalary ? 12 : 0) + (hasSeptimoDia ? 12 : 0)
    y += 15 + Math.max(earningsHeight, 30) + 10
  }
  if (showDeductions) {
    const deductionsHeight =
      20 + visibleStatutory * 12 + customDeductionsCount * 12 + (showTotalDeductions ? 15 : 0)
    y += 15 + Math.max(deductionsHeight, 30) + 15
  }
  if (showNet) {
    y += 15 + 30 + 10
  }
  if (showBank) {
    y += 15 + 45 + 10
  }
  if (showLegalNotes) {
    y += 12 + 10 + 10 + 10 + 15
  }
  if (showSignatures) {
    y += 12 + 25 + 8
  }
  y += 14

  const contentBottom = y + LAYOUT_SAFETY_PADDING
  const pageHeight = Math.max(PAGE_HEIGHT, contentBottom + FOOTER_BLOCK + MARGIN * 2)
  const footerY = pageHeight - MARGIN - FOOTER_BLOCK

  return {
    headerHeight,
    pageHeight,
    footerY,
    showEmployee: showEmployee && employeeRowCount > 0,
    employeeRowCount,
    showEarnings,
    hasSeptimoDia,
    showBaseSalary,
    showDeductions,
    visibleStatutory,
    customDeductionsCount,
    showTotalDeductions,
    showNet,
    showBank,
    showBankName,
    showBankAccount,
    showLegalNotes,
    showSignatures,
  }
}

function writeAmount(
  doc: any,
  text: string,
  y: number,
  pageWidth: number,
  bold = false
) {
  const contentWidth = pageWidth - MARGIN * 2
  if (bold) doc.font('Helvetica-Bold')
  doc.fontSize(9).fillColor('#000000').text(text, MARGIN + 10, y, {
    width: contentWidth - 20,
    align: 'right',
    lineBreak: false,
  })
  if (bold) doc.font('Helvetica')
}

export async function generateEmployeeReceiptPDF(
  record: EmployeeReceiptInput,
  periodo: string,
  quincena: number,
  companyId?: string,
  companyName?: string,
  periodLabel?: string,
  options?: VoucherPdfOptions
): Promise<Buffer> {
  const primaryColor = defaultPdfPrimaryColor(options?.branding?.primaryColor)
  const displayName = formatVoucherCompanyName(options?.branding, companyName || 'SISTEMA HONDUREÑO DE RECURSOS HUMANOS')
  const logoBuffer = await resolveCompanyLogoBuffer(options?.branding)
  const layout = buildReceiptLayout(record, options, !!logoBuffer)

  return new Promise<Buffer>((resolve, reject) => {
    try {
      const PDFDocument = require('pdfkit')
      const formatHNL = (n: number) =>
        `L. ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      const periodRangeText = formatPeriodRangeForDisplay(record.period_start, record.period_end)
      const periodDisplay = periodLabel ? `${periodLabel}: ${periodRangeText}` : periodRangeText
      const contentWidth = PAGE_WIDTH - MARGIN * 2

      const doc = new PDFDocument({
        size: [PAGE_WIDTH, layout.pageHeight],
        margin: MARGIN,
        autoFirstPage: true,
        bufferPages: true,
        info: {
          Title: `Recibo de Nómina - ${record.employee_name || 'Empleado'} - ${periodDisplay}`,
          Author: 'Sistema Hondureño de Recursos Humanos',
          Subject: 'Recibo de Nómina Individual',
          Keywords: 'recibo, nómina, empleado, Paragon, Honduras',
          Creator: 'HR SaaS System',
        },
      })

      const buffers: Buffer[] = []
      doc.on('data', (chunk: Buffer) => buffers.push(chunk))
      doc.on('end', () => {
        try {
          resolve(Buffer.concat(buffers))
        } catch (e) {
          reject(e)
        }
      })

      const pageWidth = doc.page.width
      const { headerHeight, footerY } = layout

      doc.rect(0, 0, pageWidth, headerHeight).fill(primaryColor)
      doc.fillColor('white')

      if (logoBuffer) {
        doc.image(logoBuffer, pageWidth / 2 - 40, 8, { fit: [80, 36], align: 'center' })
        doc.fontSize(10).text('Recibo de Nómina', MARGIN, 46, {
          align: 'center',
          width: contentWidth,
          lineBreak: false,
        })
        doc.fontSize(9).text(periodDisplay, MARGIN, 58, {
          align: 'center',
          width: contentWidth,
          lineBreak: false,
        })
      } else {
        doc.fontSize(16).text(displayName, MARGIN, 12, {
          align: 'center',
          width: contentWidth,
          lineBreak: false,
        })
        doc.fontSize(11).text('Recibo de Nómina', MARGIN, 32, {
          align: 'center',
          width: contentWidth,
          lineBreak: false,
        })
        doc.fontSize(10).text(periodDisplay, MARGIN, 48, {
          align: 'center',
          width: contentWidth,
          lineBreak: false,
        })
      }

      doc.fillColor('#000000')
      let yPos = headerHeight + 20

      if (layout.showEmployee) {
        doc.fontSize(11).text('INFORMACIÓN DEL EMPLEADO:', MARGIN, yPos, { lineBreak: false })
        yPos += 18

        const employeeRows: Array<{ label: string; value: string; x: number }> = []
        if (sectionVisible('emp_code', options)) {
          employeeRows.push({
            label: fieldLabel('emp_code', 'Código', options),
            value: record.employee_code || 'N/A',
            x: MARGIN + 10,
          })
        }
        if (sectionVisible('emp_name', options)) {
          employeeRows.push({
            label: fieldLabel('emp_name', 'Nombre', options),
            value: record.employee_name || 'N/A',
            x: MARGIN + 10,
          })
        }
        if (sectionVisible('department', options)) {
          employeeRows.push({
            label: fieldLabel('department', 'Departamento', options),
            value: record.department || 'N/A',
            x: MARGIN + 10,
          })
        }
        if (sectionVisible('position', options)) {
          employeeRows.push({
            label: fieldLabel('position', 'Posición', options),
            value: record.position || 'N/A',
            x: 300,
          })
        }
        if (sectionVisible('period', options)) {
          employeeRows.push({
            label: fieldLabel('period', 'Período', options),
            value: `${record.period_start} - ${record.period_end}`,
            x: 300,
          })
        }
        if (sectionVisible('days_worked', options)) {
          employeeRows.push({
            label: fieldLabel('days_worked', 'Días Trabajados', options),
            value: record.days_worked.toString(),
            x: 300,
          })
        }

        const boxHeight = Math.max(50, 16 + layout.employeeRowCount * 14)
        doc.rect(MARGIN, yPos, contentWidth, boxHeight).stroke('#000000')
        employeeRows.forEach((row, index) => {
          const rowY = yPos + 8 + index * 14
          doc.fontSize(9).text(`${row.label}:`, row.x, rowY, { lineBreak: false })
          doc.fontSize(9).text(row.value, row.x + 80, rowY, { lineBreak: false })
        })
        yPos += boxHeight + 10
      }

      if (layout.showEarnings) {
        doc.fontSize(11).text('DETALLE DE INGRESOS:', MARGIN, yPos, { lineBreak: false })
        yPos += 15
        const earningsHeight =
          20 + (layout.showBaseSalary ? 12 : 0) + (layout.hasSeptimoDia ? 12 : 0)
        doc.rect(MARGIN, yPos, contentWidth, Math.max(earningsHeight, 30)).stroke('#000000')
        let earnY = yPos + 8
        doc.fontSize(9).text('Concepto:', MARGIN + 10, earnY, { lineBreak: false })
        doc.fontSize(9).text('Monto:', MARGIN + 10, earnY, {
          width: contentWidth - 20,
          align: 'right',
          lineBreak: false,
        })
        earnY += 12
        if (layout.showBaseSalary) {
          doc.fontSize(9).text(`${fieldLabel('base_salary', 'Salario Base', options)}:`, MARGIN + 10, earnY, {
            lineBreak: false,
          })
          writeAmount(doc, formatHNL(record.base_salary), earnY, pageWidth)
          earnY += 12
        }
        if (layout.hasSeptimoDia) {
          doc.fontSize(9).text(`${fieldLabel('septimo_dia', 'Séptimo Día', options)}:`, MARGIN + 10, earnY, {
            lineBreak: false,
          })
          writeAmount(doc, formatHNL(record.septimo_dia!), earnY, pageWidth)
        }
        yPos += Math.max(earningsHeight, 30) + 10
      }

      if (layout.showDeductions) {
        doc.fontSize(11).text('DETALLE DE DEDUCCIONES:', MARGIN, yPos, { lineBreak: false })
        yPos += 15

        const deductionsHeight =
          20 +
          layout.visibleStatutory * 12 +
          layout.customDeductionsCount * 12 +
          (layout.showTotalDeductions ? 15 : 0)

        doc.rect(MARGIN, yPos, contentWidth, Math.max(deductionsHeight, 30)).stroke('#000000')
        doc.fontSize(9).text('Concepto:', MARGIN + 10, yPos + 8, { lineBreak: false })
        doc.fontSize(9).text('Monto:', MARGIN + 10, yPos + 8, {
          width: contentWidth - 20,
          align: 'right',
          lineBreak: false,
        })

        let deductionY = yPos + 20
        if (sectionVisible('ihss', options)) {
          doc.fontSize(9).text(`${fieldLabel('ihss', 'IHSS', options)}:`, MARGIN + 10, deductionY, {
            lineBreak: false,
          })
          writeAmount(doc, formatHNL(record.social_security), deductionY, pageWidth)
          deductionY += 12
        }
        if (sectionVisible('rap', options)) {
          doc.fontSize(9).text(`${fieldLabel('rap', 'RAP', options)}:`, MARGIN + 10, deductionY, {
            lineBreak: false,
          })
          writeAmount(doc, formatHNL(record.professional_tax), deductionY, pageWidth)
          deductionY += 12
        }
        if (sectionVisible('isr', options)) {
          doc.fontSize(9).text(`${fieldLabel('isr', 'ISR', options)}:`, MARGIN + 10, deductionY, {
            lineBreak: false,
          })
          writeAmount(doc, formatHNL(record.income_tax), deductionY, pageWidth)
          deductionY += 12
        }
        if (shouldShowCustomDeductionLines(record, options) && record.custom_deductions?.length) {
          record.custom_deductions.forEach((ded) => {
            doc.fontSize(9).text(`${ded.name}:`, MARGIN + 10, deductionY, { lineBreak: false })
            writeAmount(doc, formatHNL(ded.amount), deductionY, pageWidth)
            deductionY += 12
          })
        }
        if (layout.showTotalDeductions) {
          deductionY += 3
          doc.font('Helvetica-Bold')
          doc.fontSize(9).text(
            `${fieldLabel('total_deductions', 'Total Deducciones', options)}:`,
            MARGIN + 10,
            deductionY,
            { lineBreak: false }
          )
          writeAmount(doc, formatHNL(record.total_deductions), deductionY, pageWidth, true)
          doc.font('Helvetica')
        }
        yPos += Math.max(deductionsHeight, 30) + 15
      }

      if (layout.showNet) {
        doc.fontSize(11).text('RESUMEN FINAL:', MARGIN, yPos, { lineBreak: false })
        yPos += 15
        doc.rect(MARGIN, yPos, contentWidth, 30).fillAndStroke('#f0f0f0', '#000000')
        doc.font('Helvetica-Bold')
        doc.fontSize(11).text(
          `${fieldLabel('net_salary', 'TOTAL A RECIBIR', options)}:`,
          MARGIN + 10,
          yPos + 8,
          { lineBreak: false }
        )
        doc.fontSize(13).text(formatHNL(record.net_salary), MARGIN + 10, yPos + 8, {
          width: contentWidth - 20,
          align: 'right',
          lineBreak: false,
        })
        doc.font('Helvetica')
        yPos += 40
      }

      if (layout.showBank) {
        doc.fontSize(11).text('INFORMACIÓN BANCARIA:', MARGIN, yPos, { lineBreak: false })
        yPos += 15
        doc.rect(MARGIN, yPos, contentWidth, 35).stroke('#000000')
        if (layout.showBankName) {
          doc.fontSize(9).text(`${fieldLabel('bank_name', 'Banco', options)}:`, MARGIN + 10, yPos + 8, {
            lineBreak: false,
          })
          doc.fontSize(9).text(record.bank_name || 'No especificado', 120, yPos + 8, { lineBreak: false })
        }
        if (layout.showBankAccount) {
          doc.fontSize(9).text(`${fieldLabel('bank_account', 'Número de Cuenta', options)}:`, MARGIN + 10, yPos + 20, {
            lineBreak: false,
          })
          doc.fontSize(9).text(record.bank_account || 'No especificado', 120, yPos + 20, { lineBreak: false })
        }
        if (layout.showNet) {
          doc.fontSize(9).text('Monto a Transferir:', 300, yPos + 8, { lineBreak: false })
          writeAmount(doc, formatHNL(record.net_salary), yPos + 8, pageWidth)
        }
        yPos += 45
      }

      if (layout.showLegalNotes) {
        doc.fontSize(9).text('NOTAS:', MARGIN, yPos, { lineBreak: false })
        yPos += 12
        doc.fontSize(8).text('• Este recibo es un documento oficial emitido por la empresa.', MARGIN, yPos, {
          lineBreak: false,
        })
        yPos += 10
        doc.fontSize(8).text('• Los montos están calculados según la legislación laboral de Honduras.', MARGIN, yPos, {
          lineBreak: false,
        })
        yPos += 10
        doc.fontSize(8).text('• ¿Preguntas? Contacte a su manager de recursos humanos.', MARGIN, yPos, {
          lineBreak: false,
        })
        yPos += 15
      }

      if (layout.showSignatures) {
        doc.fontSize(9).text('Firma del Empleado:', MARGIN, yPos, { lineBreak: false })
        doc.rect(MARGIN, yPos + 12, 200, 25).stroke('#000000')
        doc.fontSize(9).text('Firma del Autorizado:', 300, yPos, { lineBreak: false })
        doc.rect(300, yPos + 12, 200, 25).stroke('#000000')
      }

      doc.switchToPage(0)
      doc.fontSize(7).fillColor('#666666').text(
        `Fecha de generación: ${formatDateTimeForHonduras(nowInHonduras())}`,
        MARGIN,
        footerY - 12,
        { align: 'center', width: contentWidth, lineBreak: false }
      )
      doc.fontSize(7).fillColor(PDF.footerMuted).text('SISU: Sistema Hondureño de Recursos Humanos', MARGIN, footerY, {
        align: 'center',
        width: contentWidth,
        lineBreak: false,
      })

      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}
