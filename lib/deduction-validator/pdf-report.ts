import { Buffer } from 'buffer'
import type { CountryCode } from '../country/supported'
import { PUBLIC_CALCULATOR_CONFIGS } from '../public-calculator/config'
import {
  PDF,
  drawLiquidPdfHeader,
  drawLiquidPanel,
} from '../pdf/liquid-theme'

export interface DeductionReportData {
  salary: number
  grossSalary: number
  monthlyGrossSalary: number
  paymentModality: 'quincenal' | 'mensual'
  year: number
  ihss: number
  ihssPercentage: number
  rap: number
  rapPercentage: number
  isr: number
  isrPercentage: number
  totalDeductions: number
  netSalary: number
  constants: {
    minimumWage: number
    ihssCeiling: number
  }
  countryCode?: CountryCode
}

const LEGAL_NAMES: Record<CountryCode, string> = {
  HND: 'Honduras',
  SLV: 'El Salvador',
  GTM: 'Guatemala',
}

const DEDUCTIONS_PITCH: Record<CountryCode, string> = {
  HND: 'Seguro Social, RAP e ISR',
  SLV: 'ISSS, AFP e ISR',
  GTM: 'IGSS e ISR',
}

function stripParens(label: string): string {
  return label.replace(/^\(|\)$/g, '').trim()
}

function formatMoney(country: CountryCode, value: number): string {
  const cfg = PUBLIC_CALCULATOR_CONFIGS[country]
  return new Intl.NumberFormat(cfg.locale, {
    style: 'currency',
    currency: cfg.currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0))
}

function linkedCenteredText(
  doc: PDFKit.PDFDocument,
  text: string,
  url: string,
  x: number,
  y: number,
  width: number,
  color: string
): void {
  doc.fontSize(9).fillColor(color).text(text, x, y, {
    align: 'center',
    width,
    link: url,
    underline: true,
    lineBreak: false,
  })
}

export async function generateDeductionReportPDF(
  data: DeductionReportData
): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    try {
      const PDFDocument = require('pdfkit')
      const country: CountryCode = data.countryCode ?? 'HND'
      const cfg = PUBLIC_CALCULATOR_CONFIGS[country]
      const legalName = LEGAL_NAMES[country]
      const money = (n: number) => formatMoney(country, n)

      const doc = new PDFDocument({
        size: 'A4',
        layout: 'portrait',
        margin: 30,
        info: {
          Title: `Reporte de Deducciones de Nómina - ${data.year} - ${legalName} - Humano SISU`,
          Author: 'Humano SISU',
          Subject: `Reporte de Validación de Deducciones — ${legalName}`,
          Keywords: `deducciones, nómina, ${DEDUCTIONS_PITCH[country]}, ${legalName}`,
          Creator: 'Humano SISU - Calculadora de Deducciones',
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
      const contentW = pageWidth - 60

      let yPos = drawLiquidPdfHeader(doc, {
        title: 'Reporte de Validación de Deducciones de Nómina',
        subtitle: `Sistema de Recursos Humanos — ${legalName}`,
      })

      // Información del cálculo
      doc.font('Helvetica-Bold').fontSize(11).fillColor(PDF.accentDark)
        .text('INFORMACIÓN DEL CÁLCULO', 30, yPos)
      yPos += 18

      drawLiquidPanel(doc, 30, yPos, contentW, 72, {
        fill: PDF.panelBg,
        stroke: PDF.panelBorder,
        radius: 10,
      })

      doc.font('Helvetica').fontSize(10).fillColor(PDF.bodyMuted)
      doc.text('Modalidad de Pago', 44, yPos + 12)
      doc.font('Helvetica-Bold').fillColor(PDF.bodyText)
        .text(data.paymentModality === 'quincenal' ? 'Quincenal' : 'Mensual', 44, yPos + 26)

      doc.font('Helvetica').fillColor(PDF.bodyMuted).text('Año Fiscal', 200, yPos + 12)
      doc.font('Helvetica-Bold').fillColor(PDF.bodyText)
        .text(String(data.year), 200, yPos + 26)

      doc.font('Helvetica').fillColor(PDF.bodyMuted).text('Salario Bruto', 320, yPos + 12)
      doc.font('Helvetica-Bold').fillColor(PDF.bodyText)
        .text(money(data.grossSalary), 320, yPos + 26)

      if (data.paymentModality === 'quincenal') {
        doc.font('Helvetica').fillColor(PDF.bodyMuted)
          .text('Salario mensual equivalente', 44, yPos + 48)
        doc.font('Helvetica-Bold').fillColor(PDF.bodyText)
          .text(money(data.monthlyGrossSalary), 200, yPos + 48)
      }

      yPos += 86
      doc.font('Helvetica').fontSize(9).fillColor(PDF.bodyMuted)
      doc.text(
        `${cfg.trust.minimumWageLabel} (${data.year}): ${money(data.constants.minimumWage)}`,
        34,
        yPos,
        { width: contentW / 2 - 8, lineBreak: false }
      )
      doc.text(
        `${cfg.trust.ceilingLabel} (${data.year}): ${money(data.constants.ihssCeiling)}`,
        30 + contentW / 2,
        yPos,
        { width: contentW / 2 - 4, lineBreak: false }
      )

      // Salario neto
      yPos += 22
      doc.font('Helvetica-Bold').fontSize(11).fillColor(PDF.accentDark)
        .text('RESUMEN DE RESULTADOS', 30, yPos)
      yPos += 16

      doc.roundedRect(30, yPos, contentW, 44, 10).fill(PDF.successBg)
      doc.roundedRect(30, yPos, contentW, 44, 10).lineWidth(1).stroke(PDF.successBorder)
      doc.font('Helvetica-Bold').fontSize(10).fillColor(PDF.successText)
        .text('SALARIO NETO', 44, yPos + 10)
      doc.font('Helvetica-Bold').fontSize(18).fillColor(PDF.success)
        .text(money(data.netSalary), 44, yPos + 24)

      // Desglose
      yPos += 58
      doc.font('Helvetica-Bold').fontSize(11).fillColor(PDF.accentDark)
        .text('DESGLOSE DE DEDUCCIONES', 30, yPos)
      yPos += 16

      const labels = cfg.resultLabels
      const deductionsTable: Array<{
        label: string
        description: string
        amount: number
        percentage: number
      }> = [
        {
          label: labels.socialPrimary,
          description: stripParens(labels.socialPrimaryLong),
          amount: data.ihss,
          percentage: data.ihssPercentage,
        },
      ]

      if (labels.socialSecondary && (data.rap > 0 || country === 'HND' || country === 'SLV')) {
        deductionsTable.push({
          label: labels.socialSecondary,
          description: stripParens(labels.socialSecondaryLong || labels.socialSecondary),
          amount: data.rap,
          percentage: data.rapPercentage,
        })
      }

      deductionsTable.push({
        label: 'ISR',
        description: stripParens(labels.isrLong),
        amount: data.isr,
        percentage: data.isrPercentage,
      })

      const footerReserve = 64
      for (const ded of deductionsTable) {
        drawLiquidPanel(doc, 30, yPos, contentW, 40, {
          fill: '#ffffff',
          stroke: PDF.panelBorder,
          radius: 8,
        })
        doc.font('Helvetica-Bold').fontSize(10).fillColor(PDF.bodyText)
          .text(ded.label, 44, yPos + 8, { width: 280, lineBreak: false })
        doc.font('Helvetica').fontSize(8).fillColor(PDF.bodyMuted)
          .text(ded.description, 44, yPos + 22, { width: 300, lineBreak: false, ellipsis: true })
        doc.font('Helvetica-Bold').fontSize(11).fillColor(PDF.bodyText)
          .text(money(ded.amount), 360, yPos + 8, { align: 'right', width: contentW - 346, lineBreak: false })
        doc.font('Helvetica').fontSize(9).fillColor(PDF.bodyMuted)
          .text(`${ded.percentage.toFixed(2)}%`, 360, yPos + 22, {
            align: 'right',
            width: contentW - 346,
            lineBreak: false,
          })
        yPos += 48
      }

      doc.roundedRect(30, yPos, contentW, 34, 8).fill('#fef2f2')
      doc.roundedRect(30, yPos, contentW, 34, 8).lineWidth(1).stroke('#fca5a5')
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#b91c1c')
        .text('TOTAL DE DEDUCCIONES', 44, yPos + 11)
      doc.font('Helvetica-Bold').fontSize(13).fillColor('#991b1b')
        .text(money(data.totalDeductions), 360, yPos + 10, {
          align: 'right',
          width: contentW - 346,
          lineBreak: false,
        })

      const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://humanosisu.net').replace(/\/$/, '')
      const utmSource = `calculadora-deducciones-${country.toLowerCase()}`
      const activarUrl =
        `${siteUrl}/activar?country=${country}` +
        `&utm_source=${utmSource}&utm_medium=pdf&utm_campaign=deduction-report`
      const demoWhatsApp =
        'https://wa.me/50432226773?text=' +
        encodeURIComponent(
          `Hola, calculé deducciones en Humano SISU (${legalName}) y me gustaría una demo personalizada.`
        )

      // Footers must clear bottom margin or PDFKit auto-creates overflow pages.
      const savedBottom = doc.page.margins.bottom
      doc.page.margins.bottom = 0

      const footerY = pageHeight - footerReserve
      doc.rect(0, footerY, pageWidth, footerReserve).fill('#f1f5f9')
      doc.rect(0, footerY, pageWidth, 2).fill(PDF.accent)

      doc.font('Helvetica').fontSize(7.5).fillColor(PDF.footerMuted).text(
        `Reporte generado por SISU — aplicando la legislación laboral de ${legalName}.`,
        30,
        footerY + 10,
        { align: 'center', width: contentW, lineBreak: false, ellipsis: true }
      )
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(PDF.accentDark).text(
        `Automatiza ${DEDUCTIONS_PITCH[country]} sin errores de Excel.`,
        30,
        footerY + 24,
        { align: 'center', width: contentW, lineBreak: false, ellipsis: true }
      )

      linkedCenteredText(doc, 'Activar gratis →', activarUrl, 30, footerY + 38, contentW / 2 - 8, '#1d4ed8')
      linkedCenteredText(
        doc,
        'Agendar demo por WhatsApp →',
        demoWhatsApp,
        30 + contentW / 2,
        footerY + 38,
        contentW / 2 - 4,
        '#0f766e'
      )

      doc.page.margins.bottom = savedBottom
      doc.end()
    } catch (error: unknown) {
      reject(error)
    }
  })
}
