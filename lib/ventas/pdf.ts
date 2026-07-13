import { Buffer } from 'buffer'
import type { QuotationQuote } from './types'
import {
  buildQuotationPlanSummary,
  employeesCountFromQuote,
  getContractIncludesLabels,
} from './quote-display'
import type { VentasBankDetails } from './bank-details'
import { buildModalityComparison } from './modality-comparison'
import { getVentasModalityDefinition } from './modality-includes'
import { buildTerminalsDisplayLabel, buildVentasRefLabel } from './brand-styles'
import { quoteIncludesBiometricTerminals, resolveHardwareMode } from './business-rules'
import { PDF_TYPE as TYPE, VENTAS_PDF_THEME as T } from './pdf-theme'

const MARGIN = 40
const ROW = 13

export async function generateVentasQuotationPDF(params: {
  quote: QuotationQuote
  contactEmail: string
  contactName?: string
  companyName?: string
  phone?: string
  employeesCount: number
  terminalsCount?: number
  couponCodeSubmitted?: string
  countryLabel: string
  sentAt?: Date
  bankDetails?: VentasBankDetails | null
}): Promise<Buffer> {
  const {
    quote,
    contactName,
    companyName,
    countryLabel,
    employeesCount,
    sentAt = new Date(),
    bankDetails,
  } = params

  const employees = quote.employees_count || employeesCount || employeesCountFromQuote(quote)
  const includesTerminals = quoteIncludesBiometricTerminals(quote.billing_modality, employees)
  const hardwareMode = resolveHardwareMode(quote.billing_modality, employees)
  const planSummary = buildQuotationPlanSummary({ quote, sentAt })
  const modalityComparison = buildModalityComparison({ quote, sentAt })
  const modalityDef = getVentasModalityDefinition(quote.billing_modality, {
    employeesCount: employees,
  })
  const isAnnual = quote.billing_modality === 'annual'
  const refLabel = buildVentasRefLabel(companyName, contactName)

  return new Promise<Buffer>((resolve, reject) => {
    try {
      const PDFDocument = require('pdfkit')
      const doc = new PDFDocument({
        size: 'A4',
        margin: 0,
        autoFirstPage: true,
        info: {
          Title: 'Cotización Humano SISU',
          Author: 'Humano SISU',
          Subject: 'Propuesta comercial',
        },
      })

      const buffers: Buffer[] = []
      doc.on('error', (err: Error) => reject(err))
      doc.on('data', (chunk: Buffer) => buffers.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(buffers)))

      const pageW = doc.page.width
      const contentW = pageW - MARGIN * 2

      doc.rect(0, 0, pageW, doc.page.height).fill(T.white)

      drawHeader(doc, {
        contentW,
        quoteLabel: isAnnual ? 'COTIZACIÓN ANUAL' : 'COTIZACIÓN MENSUAL',
        refLabel,
      })

      drawClientFicha(doc, {
        y: 96,
        contentW,
        companyName: companyName?.trim() || 'Su empresa',
        contactName: contactName?.trim() || 'Estimado cliente',
        countryLabel,
        tierLabel: planSummary.tierLabel,
        terminalsCount: quote.terminals_count,
        includesTerminals,
        hardwareMode,
      })

      const featuresY = 178
      const featuresH = drawFeaturesRow(doc, {
        y: featuresY,
        contentW,
        isAnnual,
        terminalsCount: quote.terminals_count,
        includesTerminals,
        hardwareMode,
      })

      const priceY = featuresY + featuresH + 10
      drawPriceCard(doc, {
        y: priceY,
        contentW,
        quote,
        planSummary,
        modalityLabel: modalityDef.label,
      })

      const comparisonY = priceY + 156
      if (modalityComparison) {
        drawComparisonStrip(doc, {
          y: comparisonY,
          contentW,
          title: modalityComparison.title,
          total: `${modalityComparison.totalLabel}: ${modalityComparison.totalValue}`,
          note: truncateText(modalityComparison.equivalentNote || modalityComparison.footnote, 120),
        })
      }

      drawFooter(doc, {
        y: modalityComparison ? comparisonY + 58 : comparisonY,
        contentW,
        bankDetails,
        isAnnual,
        includesTerminals,
      })

      doc.end()
    } catch (e) {
      reject(e)
    }
  })
}

function drawSectionTitle(doc: PDFKit.PDFDocument, text: string, x: number, y: number) {
  doc.fillColor(T.primary).font('Helvetica-Bold').fontSize(TYPE.section).text(text.toUpperCase(), x, y, {
    characterSpacing: 0.5,
  })
}

function drawMetaLabel(doc: PDFKit.PDFDocument, text: string, x: number, y: number) {
  doc.fillColor(T.textMuted).font('Helvetica').fontSize(TYPE.label).text(text.toUpperCase(), x, y)
}

function drawMetaValue(doc: PDFKit.PDFDocument, text: string, x: number, y: number, width: number, bold = false) {
  doc
    .fillColor(bold ? T.text : T.textBody)
    .font(bold ? 'Helvetica-Bold' : 'Helvetica')
    .fontSize(TYPE.value)
    .text(text, x, y, { width, lineGap: 1 })
}

function drawHeader(
  doc: PDFKit.PDFDocument,
  params: { contentW: number; quoteLabel: string; refLabel: string }
) {
  const { contentW, quoteLabel, refLabel } = params

  doc.fillColor(T.primary).font('Helvetica-Bold').fontSize(TYPE.brand).text('Humano SISU', MARGIN, MARGIN)
  doc.fillColor(T.textMuted).font('Helvetica').fontSize(TYPE.ref).text(
    `${quoteLabel}  //  REF: ${refLabel}`,
    MARGIN,
    MARGIN + 26,
    { width: contentW, align: 'right' }
  )

  doc.moveTo(MARGIN, 82).lineTo(MARGIN + contentW, 82).lineWidth(2.5).strokeColor(T.primary).stroke()
}

function drawClientFicha(
  doc: PDFKit.PDFDocument,
  params: {
    y: number
    contentW: number
    companyName: string
    contactName: string
    countryLabel: string
    tierLabel: string
    terminalsCount: number
    includesTerminals: boolean
    hardwareMode: 'included' | 'sale' | 'continuity'
  }
) {
  const {
    y,
    contentW,
    companyName,
    contactName,
    countryLabel,
    tierLabel,
    terminalsCount,
    includesTerminals,
    hardwareMode,
  } = params
  const boxH = 76
  const colW = (contentW - 36) / 2

  doc.roundedRect(MARGIN, y, contentW, boxH, 8).fill(T.panelBgAlt)
  doc.roundedRect(MARGIN, y, contentW, boxH, 8).lineWidth(0.8).stroke(T.panelBorder)

  const colAX = MARGIN + 14
  const colBX = MARGIN + 14 + colW + 8
  let rowY = y + 12

  doc.fillColor(T.textMuted).font('Helvetica').fontSize(TYPE.label)
  doc.text(`ATENCIÓN: ${contactName}`, colAX, rowY, { width: contentW - 28 })
  rowY += 16

  drawMetaLabel(doc, 'EMPRESA', colAX, rowY)
  drawMetaLabel(doc, 'ALCANCE', colBX, rowY)
  rowY += ROW
  drawMetaValue(doc, companyName, colAX, rowY, colW, true)
  drawMetaValue(doc, tierLabel, colBX, rowY, colW, true)
  rowY += ROW + 2

  drawMetaLabel(doc, 'PAÍS', colAX, rowY)
  drawMetaLabel(doc, '# DE TERMINALES', colBX, rowY)
  rowY += ROW
  drawMetaValue(doc, countryLabel, colAX, rowY, colW)
  drawMetaValue(
    doc,
    buildTerminalsDisplayLabel({ terminalsCount, includesTerminals, hardwareMode }),
    colBX,
    rowY,
    colW
  )
}

function drawFeaturesRow(
  doc: PDFKit.PDFDocument,
  params: {
    y: number
    contentW: number
    isAnnual: boolean
    terminalsCount: number
    includesTerminals: boolean
    hardwareMode: 'included' | 'sale' | 'continuity'
  }
): number {
  const { y, contentW, isAnnual, terminalsCount, includesTerminals, hardwareMode } = params
  const labels = getContractIncludesLabels({
    isAnnual,
    terminalsCount,
    includesTerminals,
    hardwareMode,
  })
  const colGap = 16
  const colW = (contentW - colGap) / 2
  const rowH = 14
  const listTop = y + 18
  const leftCol = labels.filter((_, i) => i % 2 === 0)
  const rightCol = labels.filter((_, i) => i % 2 === 1)
  const rows = Math.max(leftCol.length, rightCol.length)

  drawSectionTitle(doc, 'Incluido en su contratación', MARGIN, y)

  doc.fillColor(T.textBody).font('Helvetica').fontSize(TYPE.body)

  for (let i = 0; i < leftCol.length; i++) {
    const itemY = listTop + i * rowH
    doc.circle(MARGIN + 3, itemY + 4, 1.8).fill(T.primary)
    doc.text(leftCol[i], MARGIN + 10, itemY, { width: colW - 10, lineGap: 0 })
  }

  const rightX = MARGIN + colW + colGap
  for (let i = 0; i < rightCol.length; i++) {
    const itemY = listTop + i * rowH
    doc.circle(rightX + 3, itemY + 4, 1.8).fill(T.primary)
    doc.text(rightCol[i], rightX + 10, itemY, { width: colW - 10, lineGap: 0 })
  }

  return 18 + rows * rowH
}

function drawPriceCard(
  doc: PDFKit.PDFDocument,
  params: {
    y: number
    contentW: number
    quote: QuotationQuote
    planSummary: ReturnType<typeof buildQuotationPlanSummary>
    modalityLabel: string
  }
) {
  const { y, contentW, quote, planSummary, modalityLabel } = params
  const boxH = 148

  doc.roundedRect(MARGIN, y, contentW, boxH, 10).fill(T.panelBg)
  doc.roundedRect(MARGIN, y, contentW, boxH, 10).lineWidth(1).stroke(T.panelBorder)
  doc.rect(MARGIN, y + 12, 4, boxH - 24).fill(T.primary)

  drawSectionTitle(doc, 'Inversión', MARGIN + 16, y + 16)
  doc.fillColor(T.textMuted).font('Helvetica').fontSize(TYPE.body).text(modalityLabel, MARGIN + 16, y + 30)

  const innerX = MARGIN + 16
  let cursorY = y + 48

  for (const line of planSummary.lines) {
    const isDiscount = line.variant === 'discount'
    doc
      .fillColor(isDiscount ? T.accentDark : T.textBody)
      .font(isDiscount ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(TYPE.body)
      .text(`${line.label}: ${line.value}`, innerX, cursorY, {
        width: contentW - 32,
      })
    cursorY += 14
  }

  doc.fillColor(T.accent).font('Helvetica-Bold').fontSize(TYPE.price).text(planSummary.totalValue, innerX, cursorY + 6)
  doc.fillColor(T.text).font('Helvetica').fontSize(TYPE.value).text(planSummary.totalLabel, innerX, cursorY + 30)
}

function drawComparisonStrip(
  doc: PDFKit.PDFDocument,
  params: { y: number; contentW: number; title: string; total: string; note: string }
) {
  const { y, contentW, title, total, note } = params
  const boxH = 48

  doc.roundedRect(MARGIN, y, contentW, boxH, 8).fill(T.panelBgAlt)
  doc.roundedRect(MARGIN, y, contentW, boxH, 8).lineWidth(0.7).stroke(T.panelBorder)

  doc.fillColor(T.primary).font('Helvetica-Bold').fontSize(TYPE.section).text(title.toUpperCase(), MARGIN + 12, y + 10, {
    characterSpacing: 0.4,
  })
  doc.fillColor(T.text).font('Helvetica-Bold').fontSize(TYPE.value).text(total, MARGIN + 12, y + 22, {
    width: contentW - 24,
  })
  doc.fillColor(T.textMuted).font('Helvetica').fontSize(TYPE.label).text(note, MARGIN + 12, y + 34, {
    width: contentW - 24,
  })
}

function drawFooter(
  doc: PDFKit.PDFDocument,
  params: {
    y: number
    contentW: number
    bankDetails?: VentasBankDetails | null
    isAnnual: boolean
    includesTerminals: boolean
  }
) {
  const { y, contentW, bankDetails, isAnnual, includesTerminals } = params
  const boxW = (contentW - 14) / 2
  const boxH = 128

  const implementationTitle = 'Tiempo de implementación'
  const implementationBody = isAnnual
    ? 'Tiempo de entrega en 3 a 5 días hábiles.'
    : 'Entrega en 3 a 5 días hábiles tras confirmar el depósito.'

  const paymentIntro = isAnnual
    ? includesTerminals
      ? '50% anticipo (licencia anual) para programar la instalación y enlace de las terminales y 50% únicamente contra la instalación y enlace efectivos con el sistema.'
      : 'Anticipo del 50% sobre (licencia anual + terminales en venta) para programar la instalación. El saldo de la licencia se cancela contra instalación.'
    : 'El siguiente paso es enviar el comprobante del 100% de la primera mensualidad (software + continuidad de hardware).'

  drawSectionTitle(doc, implementationTitle, MARGIN, y)
  doc.roundedRect(MARGIN, y + 14, boxW, boxH, 8).fill(T.panelBgAlt)
  doc.roundedRect(MARGIN, y + 14, boxW, boxH, 8).lineWidth(0.7).stroke(T.panelBorder)
  doc.fillColor(T.textBody).font('Helvetica').fontSize(TYPE.body).text(
    implementationBody,
    MARGIN + 12,
    y + 28,
    { width: boxW - 24, lineGap: 2 }
  )
  doc.fillColor(T.textMuted).font('Helvetica').fontSize(TYPE.label).text(
    'Envíe comprobante por WhatsApp o responda al correo de cotización.',
    MARGIN + 12,
    y + 108,
    { width: boxW - 24 }
  )

  const paymentX = MARGIN + boxW + 14
  drawSectionTitle(doc, 'Modalidad de pago', paymentX, y)
  doc.roundedRect(paymentX, y + 14, boxW, boxH, 8).fill(T.panelBgAlt)
  doc.roundedRect(paymentX, y + 14, boxW, boxH, 8).lineWidth(0.7).stroke(T.panelBorder)

  doc.fillColor(T.textBody).font('Helvetica').fontSize(TYPE.body).text(
    paymentIntro,
    paymentX + 12,
    y + 28,
    { width: boxW - 24, lineGap: 2 }
  )

  if (bankDetails) {
    let rowY = y + (isAnnual ? 68 : 52)
    doc.font('Helvetica').fillColor(T.textBody).fontSize(TYPE.label)
    if (bankDetails.clientName) {
      doc.text(`Titular: ${bankDetails.clientName}`, paymentX + 12, rowY, { width: boxW - 24 })
      rowY += 11
    }
    if (bankDetails.clientDni) {
      doc.text(`DNI: ${bankDetails.clientDni}`, paymentX + 12, rowY, { width: boxW - 24 })
      rowY += 11
    }
    doc.font('Courier').fontSize(TYPE.bankMono).fillColor(T.text)
    if (bankDetails.bacAccount) {
      doc.text(`BAC Credomatic   ${bankDetails.bacAccount}`, paymentX + 12, rowY, { width: boxW - 24 })
      rowY += 11
    }
    if (bankDetails.banpaisAccount) {
      doc.text(`Banpais          ${bankDetails.banpaisAccount}`, paymentX + 12, rowY, { width: boxW - 24 })
      rowY += 11
    }
    if (bankDetails.atlantidaAccount) {
      doc.text(`Atlántida        ${bankDetails.atlantidaAccount}`, paymentX + 12, rowY, { width: boxW - 24 })
    }
  } else {
    doc.fillColor(T.textMuted).font('Helvetica').fontSize(TYPE.body).text(
      'Solicite datos bancarios a su asesor al confirmar.',
      paymentX + 12,
      y + 70,
      { width: boxW - 24 }
    )
  }

  doc.fillColor(T.textLight).font('Helvetica').fontSize(TYPE.footnote).text(
    'Humano SISU · humanosisu.net · Propuesta comercial · Precios en lempiras',
    MARGIN,
    y + boxH + 28,
    { width: contentW, align: 'center' }
  )
}

function truncateText(text: string, maxLen: number): string {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (normalized.length <= maxLen) return normalized
  return `${normalized.slice(0, maxLen - 1)}…`
}

namespace PDFKit {
  export interface PDFDocument {
    page: { width: number; height: number }
    save(): this
    restore(): this
    rect(x: number, y: number, w: number, h: number): this
    roundedRect(x: number, y: number, w: number, h: number, r: number): this
    circle(x: number, y: number, r: number): this
    fill(color?: string): this
    stroke(color?: string): this
    fillColor(color: string): this
    strokeColor(color: string): this
    font(name: string): this
    fontSize(size: number): this
    text(text: string, x?: number, y?: number, options?: Record<string, unknown>): this
    lineWidth(w: number): this
    moveTo(x: number, y: number): this
    lineTo(x: number, y: number): this
    widthOfString(text: string): number
    on(event: string, cb: (...args: unknown[]) => void): void
    end(): void
  }
}
