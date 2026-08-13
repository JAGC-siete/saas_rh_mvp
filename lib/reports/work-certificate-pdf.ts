import { Buffer } from 'buffer'
import type { BrandingConfig } from './report-config-schema'
import { resolveCompanyLogoBuffer } from './resolve-company-logo'
import { formatVoucherCompanyName } from '../payroll/voucher-pdf-options'
import { formatDateTimeForHonduras, nowInHonduras, parseDateOnlyAsHonduras } from '../timezone'
import {
  calculateIHSS,
  calculateRAP,
  type TaxConstants,
} from '../tax/honduras-tax'
import {
  defaultPdfPrimaryColor,
  drawBrandedReceiptHeader,
  drawLiquidFooter,
  drawLiquidHighlightBox,
  drawLiquidPanel,
  drawLiquidSectionTitle,
  drawLiquidTableHeader,
  PDF,
} from '../pdf/liquid-theme'

export interface WorkCertificateEmployee {
  id: string
  name: string
  email: string
  employee_code: string
  dni: string
  position: string
  department_name: string
  company_name: string
  hire_date: string
  termination_date: string | null
  base_salary: number
  status: string
}

export interface WorkCertificatePayload {
  employee: WorkCertificateEmployee
  certificateInfo: {
    certificateType: string
    requestDate: string
    purpose: string
    additionalInfo?: string
  }
}

export interface WorkCertificatePdfOptions {
  branding?: BrandingConfig
  includeDeductions?: boolean
}

const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89
const MARGIN = 30
const FOOTER_BLOCK = 36
const PAD = 12
const ROW_H = 14
const TABLE_HEADER_H = 20

function formatHNL(n: number): string {
  return `L. ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDateInWords(date: Date): string {
  const day = date.getDate()
  const month = date.toLocaleDateString('es-ES', { month: 'long' }).toUpperCase()
  const dayInWords = numberToWords(day)
  const dayCapitalized = dayInWords.charAt(0).toUpperCase() + dayInWords.slice(1)
  return `${dayCapitalized} de ${month}`
}

export function numberToWords(num: number): string {
  const intNum = Math.floor(num)

  const units = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve']
  const teens = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve']
  const tens = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa']
  const hundreds = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos']

  if (intNum === 0) return 'cero'
  if (intNum < 10) return units[intNum]
  if (intNum < 20) return teens[intNum - 10]
  if (intNum < 100) {
    if (intNum % 10 === 0) return tens[Math.floor(intNum / 10)]
    if (intNum < 30 && intNum > 20) return 'veinti' + units[intNum % 10]
    return tens[Math.floor(intNum / 10)] + ' y ' + units[intNum % 10]
  }
  if (intNum < 1000) {
    if (intNum === 100) return 'cien'
    if (intNum % 100 === 0) return hundreds[Math.floor(intNum / 100)]
    return hundreds[Math.floor(intNum / 100)] + ' ' + numberToWords(intNum % 100)
  }
  if (intNum < 1000000) {
    if (intNum === 1000) return 'mil'
    if (intNum < 2000) {
      const remainder = intNum % 1000
      return remainder === 0 ? 'mil' : 'mil ' + numberToWords(remainder)
    }
    if (intNum % 1000 === 0) {
      const thousands = Math.floor(intNum / 1000)
      return thousands === 1 ? 'mil' : numberToWords(thousands) + ' mil'
    }
    const thousands = Math.floor(intNum / 1000)
    const remainder = intNum % 1000
    const thousandsText = thousands === 1 ? 'mil' : numberToWords(thousands) + ' mil'
    return remainder === 0 ? thousandsText : thousandsText + ' ' + numberToWords(remainder)
  }
  if (intNum < 1000000000) {
    const millions = Math.floor(intNum / 1000000)
    const remainder = intNum % 1000000
    const millionsText = millions === 1 ? 'un millón' : numberToWords(millions) + ' millones'
    return remainder === 0 ? millionsText : millionsText + ' ' + numberToWords(remainder)
  }
  return intNum.toString()
}

function buildPeriodText(employee: WorkCertificateEmployee): string {
  const hireDate = /^\d{4}-\d{2}-\d{2}$/.test(employee.hire_date)
    ? parseDateOnlyAsHonduras(employee.hire_date)
    : new Date(employee.hire_date)
  const hireDateFormatted = formatDateInWords(hireDate)
  const isActive = employee.status === 'active'

  if (isActive) {
    return `desde el ${hireDateFormatted} de ${hireDate.getFullYear()} hasta la fecha`
  }
  if (employee.termination_date) {
    const terminationDate = /^\d{4}-\d{2}-\d{2}$/.test(employee.termination_date)
      ? parseDateOnlyAsHonduras(employee.termination_date)
      : new Date(employee.termination_date)
    const terminationDateFormatted = formatDateInWords(terminationDate)
    return `desde el ${hireDateFormatted} de ${hireDate.getFullYear()} hasta el ${terminationDateFormatted} de ${terminationDate.getFullYear()}`
  }
  return `desde el ${hireDateFormatted} de ${hireDate.getFullYear()} hasta la fecha`
}

function buildEmissionText(): string {
  const currentDate = nowInHonduras()
  const day = currentDate.getDate()
  const dayInWords = numberToWords(day)
  const monthInWords = currentDate.toLocaleDateString('es-ES', { month: 'long' }).toUpperCase()
  const yearInWords = numberToWords(currentDate.getFullYear())
  const dayPrefix = day === 1 ? 'al' : 'a los'
  const daySuffix = day === 1 ? 'día' : 'días'
  return `Esta constancia se emite a solicitud del interesado para los fines que estime convenientes. Extendida en Tegucigalpa, M.D.C., ${dayPrefix} ${dayInWords} ${daySuffix} del mes de ${monthInWords} del año ${yearInWords}.`
}

function writeAmount(
  doc: PDFKit.PDFDocument,
  text: string,
  y: number,
  pageWidth: number,
  options?: { bold?: boolean; color?: string }
): void {
  const contentWidth = pageWidth - MARGIN * 2
  if (options?.bold) doc.font('Helvetica-Bold')
  doc.fontSize(9).fillColor(options?.color ?? PDF.bodyText).text(text, MARGIN + PAD, y, {
    width: contentWidth - PAD * 2,
    align: 'right',
    lineBreak: false,
  })
  if (options?.bold) doc.font('Helvetica')
}

function drawKeyValuePanel(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  w: number,
  rows: Array<{ label: string; value: string }>
): number {
  const h = PAD * 2 + rows.length * ROW_H
  drawLiquidPanel(doc, x, y, w, h)
  rows.forEach((row, index) => {
    const rowY = y + PAD + index * ROW_H
    doc.font('Helvetica').fontSize(8.5).fillColor(PDF.bodyMuted).text(`${row.label}:`, x + PAD, rowY, {
      lineBreak: false,
    })
    doc.font('Helvetica').fontSize(9).fillColor(PDF.bodyText).text(row.value, x + PAD + 92, rowY, {
      width: w - PAD * 2 - 96,
      lineBreak: false,
    })
  })
  return y + h
}

function drawLineItemPanel(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  w: number,
  items: Array<{ label: string; amount: string }>,
  totalRow?: { label: string; amount: string }
): number {
  const bodyRows = items.length + (totalRow ? 1 : 0)
  const h = TABLE_HEADER_H + PAD + bodyRows * ROW_H + (totalRow ? 8 : PAD)
  drawLiquidPanel(doc, x, y, w, h)

  const colConcept = Math.floor(w * 0.62)
  const colAmount = w - colConcept - 2
  drawLiquidTableHeader(doc, x + 1, y + 1, [colConcept, colAmount], ['Concepto', 'Monto'], TABLE_HEADER_H - 2)

  let rowY = y + TABLE_HEADER_H + 6
  items.forEach((item, idx) => {
    const stripe = idx % 2 === 1 ? PDF.tableStripe : PDF.white
    doc.rect(x + 1, rowY - 2, w - 2, ROW_H).fill(stripe)
    doc.font('Helvetica').fontSize(9).fillColor(PDF.bodyText)
    doc.text(item.label, x + PAD, rowY, { lineBreak: false })
    writeAmount(doc, item.amount, rowY, doc.page.width)
    rowY += ROW_H
  })

  if (totalRow) {
    rowY += 2
    doc.moveTo(x + PAD, rowY - 4).lineTo(x + w - PAD, rowY - 4).strokeColor(PDF.panelBorder).stroke()
    doc.font('Helvetica-Bold').fontSize(9).fillColor(PDF.accentDark)
    doc.text(totalRow.label, x + PAD, rowY, { lineBreak: false })
    writeAmount(doc, totalRow.amount, rowY, doc.page.width, { bold: true, color: PDF.accentDark })
  }

  doc.font('Helvetica').fillColor(PDF.bodyText)
  return y + h
}

export async function generateWorkCertificatePDFBuffer(
  certificateData: WorkCertificatePayload,
  taxConstants: TaxConstants,
  options?: WorkCertificatePdfOptions
): Promise<Buffer> {
  const includeDeductions = options?.includeDeductions ?? true
  const primaryColor = defaultPdfPrimaryColor(options?.branding?.primaryColor)
  const logoBuffer = await resolveCompanyLogoBuffer(options?.branding)
  const legalCompanyName = formatVoucherCompanyName(
    options?.branding,
    certificateData.employee.company_name || 'SISTEMA HONDUREÑO DE RECURSOS HUMANOS'
  )
  const generatedAt = formatDateTimeForHonduras(nowInHonduras())
  const periodText = buildPeriodText(certificateData.employee)
  const salaryFormatted = formatHNL(certificateData.employee.base_salary)
  const salaryInWords = numberToWords(certificateData.employee.base_salary)

  let mainText = `Por medio de la presente, ${legalCompanyName.toUpperCase()} certifica que ${certificateData.employee.name}, con Documento Nacional de Identificación No. ${certificateData.employee.dni}, se desempeña en esta empresa bajo contrato permanente, ocupando el cargo de "${certificateData.employee.position}" ${periodText}, con un salario mensual de ${salaryFormatted} (${salaryInWords} lempiras exactos)`
  if (includeDeductions) {
    mainText += ', con las siguientes deducciones:'
  } else {
    mainText += '.'
  }

  const ihssMonthly = Math.round(calculateIHSS(certificateData.employee.base_salary, taxConstants) * 100) / 100
  const rapMonthly = Math.round(calculateRAP(certificateData.employee.base_salary, taxConstants) * 100) / 100
  const totalDeductions = ihssMonthly + rapMonthly
  const netSalary = certificateData.employee.base_salary - totalDeductions

  const contentWidth = PAGE_WIDTH - MARGIN * 2

  return new Promise<Buffer>((resolve, reject) => {
    try {
      const PDFDocument = require('pdfkit')
      const probe = new PDFDocument({ size: [PAGE_WIDTH, PAGE_HEIGHT], margin: MARGIN })
      probe.font('Helvetica').fontSize(11)
      const mainTextHeight =
        probe.heightOfString(mainText, { width: contentWidth - PAD * 2, align: 'justify' }) + PAD * 2
      const bodyPanelH = Math.max(72, mainTextHeight)

      let layoutY = 92 + 16 + 6 * ROW_H + 12 + 14 + bodyPanelH + 12
      if (includeDeductions) {
        layoutY += 14 + 90 + 14 + 42 + 12
      }
      layoutY += 60 + FOOTER_BLOCK + MARGIN
      const pageHeight = Math.max(PAGE_HEIGHT, layoutY)
      const footerY = pageHeight - MARGIN - FOOTER_BLOCK

      const doc = new PDFDocument({
        size: [PAGE_WIDTH, pageHeight],
        margin: MARGIN,
        autoFirstPage: true,
        bufferPages: true,
        info: {
          Title: `Constancia Laboral - ${certificateData.employee.name}`,
          Author: legalCompanyName,
          Subject: 'Constancia Laboral',
          Keywords: 'constancia, trabajo, empleado, Honduras, Humano SISU',
          Creator: 'Humano SISU',
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
      doc.on('error', reject)

      let yPos = drawBrandedReceiptHeader(doc, {
        primaryColor,
        companyName: legalCompanyName,
        title: 'Constancia Laboral',
        subtitle: certificateData.certificateInfo.purpose || 'Emitida a solicitud del interesado',
        logoBuffer,
      })

      drawLiquidSectionTitle(doc, 'Datos del empleado', MARGIN, yPos)
      yPos += 16
      yPos =
        drawKeyValuePanel(doc, MARGIN, yPos, contentWidth, [
          { label: 'Nombre', value: certificateData.employee.name },
          { label: 'DNI', value: certificateData.employee.dni },
          { label: 'Código', value: certificateData.employee.employee_code || 'N/A' },
          { label: 'Cargo', value: certificateData.employee.position },
          { label: 'Departamento', value: certificateData.employee.department_name },
          { label: 'Período', value: periodText },
        ]) + 12

      drawLiquidSectionTitle(doc, 'Constancia', MARGIN, yPos)
      yPos += 14
      drawLiquidPanel(doc, MARGIN, yPos, contentWidth, bodyPanelH)
      doc.font('Helvetica').fontSize(11).fillColor(PDF.bodyText).text(mainText, MARGIN + PAD, yPos + PAD, {
        width: contentWidth - PAD * 2,
        align: 'justify',
      })
      yPos += bodyPanelH + 12

      if (includeDeductions) {
        drawLiquidSectionTitle(doc, 'Desglose salarial', MARGIN, yPos)
        yPos += 14
        yPos =
          drawLineItemPanel(
            doc,
            MARGIN,
            yPos,
            contentWidth,
            [
              { label: 'Salario base', amount: salaryFormatted },
              { label: 'Deducciones (RAP / IHSS)', amount: formatHNL(totalDeductions) },
            ],
            { label: 'Salario neto mensual', amount: formatHNL(netSalary) }
          ) + 14

        const netBoxH = 40
        drawLiquidHighlightBox(doc, MARGIN, yPos, contentWidth, netBoxH, { variant: 'success' })
        doc.font('Helvetica-Bold').fontSize(10).fillColor(PDF.successText)
        doc.text('Total neto mensual', MARGIN + PAD, yPos + 10, { lineBreak: false })
        doc.fontSize(14).fillColor(PDF.success)
        doc.text(formatHNL(netSalary), MARGIN + PAD, yPos + 10, {
          width: contentWidth - PAD * 2,
          align: 'right',
          lineBreak: false,
        })
        doc.font('Helvetica').fillColor(PDF.bodyText)
        yPos += netBoxH + 12
      }

      drawLiquidSectionTitle(doc, 'Emisión', MARGIN, yPos)
      yPos += 14
      doc.font('Helvetica').fontSize(10).fillColor(PDF.bodyMuted).text(buildEmissionText(), MARGIN + 4, yPos, {
        width: contentWidth - 8,
        align: 'justify',
      })

      doc.switchToPage(0)
      doc.fontSize(7).fillColor(PDF.footerMuted).text(`Fecha de generación: ${generatedAt}`, MARGIN, footerY - 14, {
        align: 'center',
        width: contentWidth,
        lineBreak: false,
      })
      drawLiquidFooter(doc, 'Humano SISU · Sistema Hondureño de Recursos Humanos', {
        y: footerY,
        fontSize: 7,
      })

      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}
