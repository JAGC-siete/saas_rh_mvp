import { Buffer } from 'buffer'
import type { QuotationQuote } from './types'
import { formatMoney } from './pricing'

export async function generateVentasQuotationPDF(params: {
  quote: QuotationQuote
  contactEmail: string
  contactName?: string
  companyName?: string
  phone?: string
  employeesCount: number
  terminalsCount?: number
  couponCodeSubmitted?: string
}): Promise<Buffer> {
  const {
    quote,
    contactEmail,
    contactName,
    companyName,
    phone,
    employeesCount,
    terminalsCount,
    couponCodeSubmitted,
  } = params

  return new Promise<Buffer>((resolve, reject) => {
    try {
      const PDFDocument = require('pdfkit')
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        info: {
          Title: 'Cotización SISU',
          Author: 'Humano SISU',
          Subject: 'Cotización automática',
        },
      })

      const buffers: Buffer[] = []
      doc.on('error', (err: Error) => reject(err))
      doc.on('data', (chunk: Buffer) => buffers.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(buffers)))

      // Header band
      doc.rect(0, 0, doc.page.width, 90).fill('#0b4fa1')
      doc.fillColor('white')
      doc.fontSize(22).text('Humano SISU', 40, 26)
      doc.fontSize(12).text('Cotización automática', 40, 56)

      doc.fillColor('#0f172a')
      doc.fontSize(11).text('DATOS DE CONTACTO', 40, 110)
      doc
        .fontSize(10)
        .text(`Email: ${contactEmail}`, 40, 128)
        .text(`Nombre: ${contactName?.trim() || '—'}`, 40, 144)
        .text(`Empresa: ${companyName?.trim() || '—'}`, 40, 160)
        .text(`Teléfono: ${phone?.trim() || '—'}`, 40, 176)

      doc.fontSize(11).text('PARÁMETROS', 40, 206)
      doc
        .fontSize(10)
        .text(`Empleados (ingresado): ${employeesCount}`, 40, 224)
        .text(`Rango aplicado: ${quote.tier.min_employees}–${quote.tier.max_employees}`, 40, 240)
        .text(`Terminales: ${typeof terminalsCount === 'number' ? terminalsCount : '—'}`, 40, 256)
        .text(`Cupón: ${couponCodeSubmitted?.trim() ? couponCodeSubmitted.trim() : '—'}`, 40, 272)

      // Totals box
      const boxY = 312
      doc.roundedRect(40, boxY, doc.page.width - 80, 140, 12).stroke('#cbd5e1')
      doc.fontSize(12).text('RESUMEN', 56, boxY + 18)

      const lineY = (i: number) => boxY + 44 + i * 22
      doc.fontSize(10)
      doc.text('Subtotal', 56, lineY(0))
      doc.text(formatMoney(quote.currency, quote.subtotal), 0, lineY(0), { align: 'right', width: doc.page.width - 56 })

      doc.text('Descuento', 56, lineY(1))
      const discountLabel = quote.coupon_applied
        ? `-${formatMoney(quote.currency, quote.discount_amount)}`
        : formatMoney(quote.currency, 0)
      doc.text(discountLabel, 0, lineY(1), { align: 'right', width: doc.page.width - 56 })

      doc.fontSize(12)
      doc.text('Total', 56, lineY(2) + 2)
      doc.fillColor('#166534')
      doc.text(formatMoney(quote.currency, quote.total), 0, lineY(2) + 2, { align: 'right', width: doc.page.width - 56 })
      doc.fillColor('#0f172a')

      doc
        .fontSize(9)
        .fillColor('#475569')
        .text(
          'Nota: Esta cotización es automática y orientativa. Un asesor puede confirmar alcance y tiempos según tu operación.',
          40,
          boxY + 160,
          { width: doc.page.width - 80 }
        )

      doc.end()
    } catch (e) {
      reject(e)
    }
  })
}

