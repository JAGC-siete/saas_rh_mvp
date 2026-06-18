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

function fieldLabel(id: string, fallback: string, options?: VoucherPdfOptions): string {
  return options?.labels?.[id] ?? fallback
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

  const showEmployee =
    sectionVisible('emp_code', options) ||
    sectionVisible('emp_name', options) ||
    sectionVisible('department', options) ||
    sectionVisible('position', options) ||
    sectionVisible('period', options) ||
    sectionVisible('days_worked', options)

  const showEarnings =
    sectionVisible('base_salary', options) ||
    ((record.septimo_dia ?? 0) > 0 && sectionVisible('septimo_dia', options))

  const showDeductions =
    sectionVisible('ihss', options) ||
    sectionVisible('rap', options) ||
    sectionVisible('isr', options) ||
    (sectionVisible('custom_deductions', options) && (record.custom_deductions?.length ?? 0) > 0) ||
    sectionVisible('total_deductions', options)

  const showBank =
    sectionVisible('bank_name', options) || sectionVisible('bank_account', options)

  return new Promise<Buffer>((resolve, reject) => {
    try {
      const PDFDocument = require('pdfkit')
      const formatHNL = (n: number) =>
        `L. ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      const periodRangeText = formatPeriodRangeForDisplay(record.period_start, record.period_end)
      const periodDisplay = periodLabel ? `${periodLabel}: ${periodRangeText}` : periodRangeText

      const doc = new PDFDocument({
        size: 'A4',
        layout: 'portrait',
        margin: 30,
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
      const pageHeight = doc.page.height
      const headerHeight = logoBuffer ? 72 : 60

      doc.rect(0, 0, pageWidth, headerHeight).fill(primaryColor)
      doc.fillColor('white')

      if (logoBuffer) {
        doc.image(logoBuffer, pageWidth / 2 - 40, 8, { fit: [80, 36], align: 'center' })
        doc.fontSize(10).text('Recibo de Nómina', 30, 46, { align: 'center', width: pageWidth - 60 })
        doc.fontSize(9).text(periodDisplay, 30, 58, { align: 'center', width: pageWidth - 60 })
      } else {
        doc.fontSize(16).text(displayName, 30, 12, { align: 'center', width: pageWidth - 60 })
        doc.fontSize(11).text('Recibo de Nómina', 30, 32, { align: 'center', width: pageWidth - 60 })
        doc.fontSize(10).text(periodDisplay, 30, 48, { align: 'center', width: pageWidth - 60 })
      }

      doc.fillColor('#000000')

      const footerY = pageHeight - 20
      doc.fontSize(7).fillColor(PDF.footerMuted).text('SISU: Sistema Hondureño de Recursos Humanos', 30, footerY, {
        align: 'center',
        width: pageWidth - 60,
      })

      let yPos = headerHeight + 20

      if (showEmployee) {
        doc.fontSize(11).fillColor('#000000').text('INFORMACIÓN DEL EMPLEADO:', 30, yPos)
        yPos += 18

        const employeeRows: Array<{ label: string; value: string; x: number }> = []
        if (sectionVisible('emp_code', options)) {
          employeeRows.push({
            label: fieldLabel('emp_code', 'Código', options),
            value: record.employee_code || 'N/A',
            x: 40,
          })
        }
        if (sectionVisible('emp_name', options)) {
          employeeRows.push({
            label: fieldLabel('emp_name', 'Nombre', options),
            value: record.employee_name || 'N/A',
            x: 40,
          })
        }
        if (sectionVisible('department', options)) {
          employeeRows.push({
            label: fieldLabel('department', 'Departamento', options),
            value: record.department || 'N/A',
            x: 40,
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

        const boxHeight = Math.max(50, 16 + employeeRows.length * 14)
        doc.rect(30, yPos, pageWidth - 60, boxHeight).stroke('#000000')
        employeeRows.forEach((row, index) => {
          const rowY = yPos + 8 + index * 14
          doc.fontSize(9).fillColor('#000000').text(`${row.label}:`, row.x, rowY)
          doc.fontSize(9).fillColor('#000000').text(row.value, row.x + 80, rowY)
        })
        yPos += boxHeight + 10
      }

      if (showEarnings) {
        doc.fontSize(11).fillColor('#000000').text('DETALLE DE INGRESOS:', 30, yPos)
        yPos += 15
        const hasSeptimoDia = (record.septimo_dia ?? 0) > 0 && sectionVisible('septimo_dia', options)
        const earningsHeight = 20 + (sectionVisible('base_salary', options) ? 12 : 0) + (hasSeptimoDia ? 12 : 0)
        doc.rect(30, yPos, pageWidth - 60, Math.max(earningsHeight, 30)).stroke('#000000')
        let earnY = yPos + 8
        doc.fontSize(9).fillColor('#000000').text('Concepto:', 40, earnY)
        doc.fontSize(9).fillColor('#000000').text('Monto:', 450, earnY)
        earnY += 12
        if (sectionVisible('base_salary', options)) {
          doc.fontSize(9).fillColor('#000000').text(`${fieldLabel('base_salary', 'Salario Base', options)}:`, 40, earnY)
          doc.fontSize(9).fillColor('#000000').text(formatHNL(record.base_salary), 450, earnY, { align: 'right' })
          earnY += 12
        }
        if (hasSeptimoDia) {
          doc.fontSize(9).fillColor('#000000').text(`${fieldLabel('septimo_dia', 'Séptimo Día', options)}:`, 40, earnY)
          doc.fontSize(9).fillColor('#000000').text(formatHNL(record.septimo_dia!), 450, earnY, { align: 'right' })
        }
        yPos += Math.max(earningsHeight, 30) + 10
      }

      if (showDeductions) {
        doc.fontSize(11).fillColor('#000000').text('DETALLE DE DEDUCCIONES:', 30, yPos)
        yPos += 15

        const customDeductionsCount =
          sectionVisible('custom_deductions', options) ? record.custom_deductions?.length || 0 : 0
        const visibleStatutory =
          (sectionVisible('ihss', options) ? 1 : 0) +
          (sectionVisible('rap', options) ? 1 : 0) +
          (sectionVisible('isr', options) ? 1 : 0)
        const deductionsHeight =
          20 + visibleStatutory * 12 + customDeductionsCount * 12 + (sectionVisible('total_deductions', options) ? 15 : 0)

        doc.rect(30, yPos, pageWidth - 60, Math.max(deductionsHeight, 30)).stroke('#000000')
        doc.fontSize(9).fillColor('#000000').text('Concepto:', 40, yPos + 8)
        doc.fontSize(9).fillColor('#000000').text('Monto:', 450, yPos + 8)

        let deductionY = yPos + 20
        if (sectionVisible('ihss', options)) {
          doc.fontSize(9).fillColor('#000000').text(`${fieldLabel('ihss', 'IHSS', options)}:`, 40, deductionY)
          doc.fontSize(9).fillColor('#000000').text(formatHNL(record.social_security), 450, deductionY, { align: 'right' })
          deductionY += 12
        }
        if (sectionVisible('rap', options)) {
          doc.fontSize(9).fillColor('#000000').text(`${fieldLabel('rap', 'RAP', options)}:`, 40, deductionY)
          doc.fontSize(9).fillColor('#000000').text(formatHNL(record.professional_tax), 450, deductionY, { align: 'right' })
          deductionY += 12
        }
        if (sectionVisible('isr', options)) {
          doc.fontSize(9).fillColor('#000000').text(`${fieldLabel('isr', 'ISR', options)}:`, 40, deductionY)
          doc.fontSize(9).fillColor('#000000').text(formatHNL(record.income_tax), 450, deductionY, { align: 'right' })
          deductionY += 12
        }
        if (sectionVisible('custom_deductions', options) && record.custom_deductions?.length) {
          record.custom_deductions.forEach((ded) => {
            doc.fontSize(9).fillColor('#000000').text(`${ded.name}:`, 40, deductionY)
            doc.fontSize(9).fillColor('#000000').text(formatHNL(ded.amount), 450, deductionY, { align: 'right' })
            deductionY += 12
          })
        }
        if (sectionVisible('total_deductions', options)) {
          deductionY += 3
          doc.fontSize(9).font('Helvetica-Bold').fillColor('#000000').text(
            `${fieldLabel('total_deductions', 'Total Deducciones', options)}:`,
            40,
            deductionY
          )
          doc.fontSize(9).font('Helvetica-Bold').fillColor('#000000').text(
            formatHNL(record.total_deductions),
            450,
            deductionY,
            { align: 'right' }
          )
          doc.font('Helvetica')
        }
        yPos += Math.max(deductionsHeight, 30) + 15
      }

      if (sectionVisible('net_salary', options)) {
        doc.fontSize(11).fillColor('#000000').text('RESUMEN FINAL:', 30, yPos)
        yPos += 15
        doc.rect(30, yPos, pageWidth - 60, 30).fillAndStroke('#f0f0f0', '#000000')
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#000000').text(
          `${fieldLabel('net_salary', 'TOTAL A RECIBIR', options)}:`,
          40,
          yPos + 8
        )
        doc.fontSize(13).font('Helvetica-Bold').fillColor('#000000').text(
          formatHNL(record.net_salary),
          450,
          yPos + 8,
          { align: 'right' }
        )
        doc.font('Helvetica')
        yPos += 40
      }

      if (showBank) {
        doc.fontSize(11).fillColor('#000000').text('INFORMACIÓN BANCARIA:', 30, yPos)
        yPos += 15
        doc.rect(30, yPos, pageWidth - 60, 35).stroke('#000000')
        if (sectionVisible('bank_name', options)) {
          doc.fontSize(9).fillColor('#000000').text(`${fieldLabel('bank_name', 'Banco', options)}:`, 40, yPos + 8)
          doc.fontSize(9).fillColor('#000000').text(record.bank_name || 'No especificado', 120, yPos + 8)
        }
        if (sectionVisible('bank_account', options)) {
          doc.fontSize(9).fillColor('#000000').text(`${fieldLabel('bank_account', 'Número de Cuenta', options)}:`, 40, yPos + 20)
          doc.fontSize(9).fillColor('#000000').text(record.bank_account || 'No especificado', 120, yPos + 20)
        }
        if (sectionVisible('net_salary', options)) {
          doc.fontSize(9).fillColor('#000000').text('Monto a Transferir:', 300, yPos + 8)
          doc.fontSize(9).font('Helvetica-Bold').fillColor('#000000').text(
            formatHNL(record.net_salary),
            450,
            yPos + 8,
            { align: 'right' }
          )
          doc.font('Helvetica')
        }
        yPos += 45
      }

      if (sectionVisible('legal_notes', options)) {
        doc.fontSize(9).fillColor('#000000').text('NOTAS:', 30, yPos)
        yPos += 12
        doc.fontSize(8).fillColor('#000000').text('• Este recibo es un documento oficial emitido por la empresa.', 30, yPos)
        yPos += 10
        doc.fontSize(8).fillColor('#000000').text('• Los montos están calculados según la legislación laboral de Honduras.', 30, yPos)
        yPos += 10
        doc.fontSize(8).fillColor('#000000').text('• ¿Preguntas? Contacte a su manager de recursos humanos.', 30, yPos)
        yPos += 15
      }

      if (sectionVisible('signatures', options)) {
        doc.fontSize(9).fillColor('#000000').text('Firma del Empleado:', 30, yPos)
        doc.rect(30, yPos + 12, 200, 25).stroke('#000000')
        doc.fontSize(9).fillColor('#000000').text('Firma del Autorizado:', 300, yPos)
        doc.rect(300, yPos + 12, 200, 25).stroke('#000000')
      }

      doc.fontSize(7).fillColor('#666666').text(
        `Fecha de generación: ${formatDateTimeForHonduras(nowInHonduras())}`,
        30,
        footerY - 10,
        { align: 'center', width: pageWidth - 60 }
      )

      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}
