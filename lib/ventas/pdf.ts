import { Buffer } from 'buffer'
import type { QuotationQuote } from './types'
import { formatMoney } from './pricing'
import type { UrgencyOffer } from './urgency-offer'
import { formatUrgencyOfferExpiryFriendly } from './urgency-offer'
import type { VentasBankDetails } from './bank-details'
import { buildBankDetailsPlainText } from './bank-details'
import {
  buildModalityIncludesPlainLines,
  buildTerminalsPricingNote,
  VENTAS_MAX_AUTO_QUOTE_TERMINALS,
} from './modality-includes'

export async function generateVentasQuotationPDF(params: {
  quote: QuotationQuote
  contactEmail: string
  contactName?: string
  companyName?: string
  phone?: string
  employeesCount: number
  terminalsCount?: number
  couponCodeSubmitted?: string
  /** Ej. Honduras */
  countryLabel: string
  urgencyOffer?: UrgencyOffer
  bankDetails?: VentasBankDetails | null
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
    countryLabel,
    urgencyOffer,
    bankDetails,
  } = params

  return new Promise<Buffer>((resolve, reject) => {
    try {
      const PDFDocument = require('pdfkit')
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        info: {
          Title: 'Cotización Humano SISU',
          Author: 'Humano SISU',
          Subject: 'Cotización',
        },
      })

      const buffers: Buffer[] = []
      doc.on('error', (err: Error) => reject(err))
      doc.on('data', (chunk: Buffer) => buffers.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(buffers)))

      doc.rect(0, 0, doc.page.width, 90).fill('#0b4fa1')
      doc.fillColor('white')
      doc.fontSize(22).text('Humano SISU', 40, 26)
      doc.fontSize(12).text('Cotización', 40, 56)

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
        .text(`País de operación: ${countryLabel}`, 40, 224)
        .text(`Empleados declarados: ${employeesCount}`, 40, 240)
        .text(`Rango tarifario: ${quote.tier.min_employees}–${quote.tier.max_employees}`, 40, 256)
        .text(`Modalidad de facturación: ${quote.billing_modality === 'monthly' ? 'Mensual' : 'Anual'}`, 40, 272)
        .text(
          buildTerminalsPricingNote({
            modality: quote.billing_modality,
            terminalsCount: quote.terminals_count || terminalsCount || 1,
          }),
          40,
          288,
          { width: doc.page.width - 80 }
        )
        .text(`Cupón: ${couponCodeSubmitted?.trim() ? couponCodeSubmitted.trim() : '—'}`, 40, 318)

      let cursorY = 358
      doc.fontSize(11).text('QUÉ INCLUYE ESTA MODALIDAD', 40, cursorY)
      cursorY += 18
      doc.fontSize(9).fillColor('#334155')
      for (const line of buildModalityIncludesPlainLines(quote.billing_modality)) {
        if (cursorY > doc.page.height - 80) {
          doc.addPage()
          cursorY = 40
        }
        doc.text(line, 40, cursorY, { width: doc.page.width - 80 })
        cursorY += line.startsWith('Plan') ? 16 : 13
      }
      doc.fillColor('#0f172a')
      cursorY += 10

      const isMonthly = quote.billing_modality === 'monthly'
      const boxHeight = isMonthly ? 132 : 132
      doc.roundedRect(40, cursorY, doc.page.width - 80, boxHeight, 12).stroke('#cbd5e1')
      doc.fontSize(12).text('RESUMEN DE COTIZACIÓN', 56, cursorY + 18)

      const lineY = (i: number) => cursorY + 44 + i * 22
      doc.fontSize(10)
      if (isMonthly) {
        doc.text('Software (mensual)', 56, lineY(0))
        doc.text(formatMoney(quote.currency, quote.monthly_software_total) + ' / mes', 0, lineY(0), {
          align: 'right',
          width: doc.page.width - 56,
        })

        doc.text('Continuidad hardware', 56, lineY(1))
        doc.text(formatMoney(quote.currency, quote.monthly_hardware_fee) + ' / mes', 0, lineY(1), {
          align: 'right',
          width: doc.page.width - 56,
        })

        doc.fontSize(12)
        doc.text('Total mensual cotizado', 56, lineY(2) + 2)
        doc.fillColor('#166534')
        doc.text(formatMoney(quote.currency, quote.monthly_total) + ' / mes', 0, lineY(2) + 2, {
          align: 'right',
          width: doc.page.width - 56,
        })
        doc.fillColor('#0f172a')

        doc.fontSize(9).fillColor('#475569')
        doc.text('Terminal biométrica: venta por separado', 56, lineY(3), {
          width: doc.page.width - 120,
        })
        doc.fillColor('#0f172a')
      } else {
        doc.text('Subtotal (anual)', 56, lineY(0))
        doc.text(formatMoney(quote.currency, quote.annual_subtotal) + ' / año', 0, lineY(0), {
          align: 'right',
          width: doc.page.width - 56,
        })

        doc.text('Descuento por cupón', 56, lineY(1))
        const discountLabel = quote.coupon_applied
          ? `-${formatMoney(quote.currency, quote.annual_discount_amount)}`
          : formatMoney(quote.currency, 0)
        doc.text(discountLabel + ' / año', 0, lineY(1), { align: 'right', width: doc.page.width - 56 })

        doc.fontSize(12)
        doc.text('Total anual cotizado', 56, lineY(2) + 2)
        doc.fillColor('#166534')
        doc.text(formatMoney(quote.currency, quote.annual_total) + ' / año', 0, lineY(2) + 2, {
          align: 'right',
          width: doc.page.width - 56,
        })
        doc.fillColor('#0f172a')

        doc.fontSize(9).fillColor('#475569')
        doc.text(
          `Terminal biométrica incluida · ${quote.terminals_count || terminalsCount || 1} declarada(s) (hasta ${VENTAS_MAX_AUTO_QUOTE_TERMINALS} en cotización automática)`,
          56,
          lineY(3),
          { width: doc.page.width - 120 }
        )
        doc.fillColor('#0f172a')
      }

      cursorY = boxYAfterSummary(cursorY, boxHeight)

      if (urgencyOffer?.isActive) {
        const periodLabel = isMonthly ? 'mes' : 'año'
        const urgencyHeight = 118
        doc.roundedRect(40, cursorY, doc.page.width - 80, urgencyHeight, 12).stroke('#86efac')
        doc.fontSize(12).fillColor('#0f172a').text('OFERTA POR CONTRATACIÓN RÁPIDA (72 H)', 56, cursorY + 16)
        doc.fontSize(10)
        doc.text(`Precio cotizado`, 56, cursorY + 40)
        doc.text(`${formatMoney(quote.currency, urgencyOffer.quotedTotal)} / ${periodLabel}`, 0, cursorY + 40, {
          align: 'right',
          width: doc.page.width - 56,
        })
        doc.text('Descuento 20% por contratar en 72 h', 56, cursorY + 62)
        doc.text(`-${formatMoney(quote.currency, urgencyOffer.discountAmount)} / ${periodLabel}`, 0, cursorY + 62, {
          align: 'right',
          width: doc.page.width - 56,
        })
        doc.fontSize(11).fillColor('#166534')
        doc.text('Precio con descuento', 56, cursorY + 84)
        doc.text(`${formatMoney(quote.currency, urgencyOffer.discountedTotal)} / ${periodLabel}`, 0, cursorY + 84, {
          align: 'right',
          width: doc.page.width - 56,
        })
        doc.fontSize(9).fillColor('#475569')
        doc.text(
          `Válido hasta ${formatUrgencyOfferExpiryFriendly(urgencyOffer.expiresAt)} (hora Honduras).`,
          56,
          cursorY + 102,
          { width: doc.page.width - 120 }
        )
        doc.fillColor('#0f172a')
        cursorY += urgencyHeight + 16
      }

      if (bankDetails) {
        const bankLines = buildBankDetailsPlainText(bankDetails).split('\n')
        doc.fontSize(11).text('DATOS BANCARIOS', 40, cursorY)
        cursorY += 18
        doc.fontSize(9).fillColor('#334155')
        for (const line of bankLines) {
          if (cursorY > doc.page.height - 60) {
            doc.addPage()
            cursorY = 40
          }
          doc.text(line || ' ', 40, cursorY, { width: doc.page.width - 80 })
          cursorY += line.trim() ? 14 : 8
        }
        doc.fillColor('#0f172a')
        cursorY += 8
      }

      doc
        .fontSize(9)
        .fillColor('#475569')
        .text(
          'Nota: cotización orientativa con precio de lista. Si aplica oferta por contratación en 72 h, el descuento se confirma en el correo y al formalizar. Un asesor confirma alcance, integraciones y vigencia.',
          40,
          cursorY + 6,
          { width: doc.page.width - 80 }
        )

      doc.end()
    } catch (e) {
      reject(e)
    }
  })
}

function boxYAfterSummary(startY: number, boxHeight: number): number {
  return startY + boxHeight + 18
}
