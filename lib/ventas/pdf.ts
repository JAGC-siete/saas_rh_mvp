import { Buffer } from 'buffer'
import type { QuotationQuote } from './types'
import {
  buildQuotationPlanSummary,
  employeesCountFromQuote,
  getContractIncludesLabels,
  annualPaymentIntroText,
} from './quote-display'
import type { VentasBankDetails } from './bank-details'
import { buildModalityComparison } from './modality-comparison'
import { getVentasModalityDefinition } from './modality-includes'
import { buildTerminalsDisplayLabel, buildVentasRefLabel } from './brand-styles'
import { quoteIncludesBiometricTerminals, resolveHardwareMode, resolveIncludedTerminalsCap } from './business-rules'
import { convertVentasMoney, pricesInCurrencyFooter, VENTAS_PRICE_LIST_CURRENCY } from './currency'
import { PDF_TYPE as TYPE, VENTAS_PDF_THEME as T } from './pdf-theme'
import { HONDURAS_TIMEZONE } from '../timezone'

const MARGIN = 48

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
  const ruleOpts = {
    rules: quote.business_rules,
    tier: {
      annual_terminal_mode: quote.tier?.annual_terminal_mode,
      included_terminals_max: quote.tier?.included_terminals_max,
    },
  }
  const includesTerminals =
    quote.hardware_mode === 'included' ||
    quoteIncludesBiometricTerminals(quote.billing_modality, employees, ruleOpts)
  const hardwareMode =
    quote.hardware_mode || resolveHardwareMode(quote.billing_modality, employees, ruleOpts)
  const includedCap = resolveIncludedTerminalsCap(quote.business_rules, ruleOpts.tier)
  const planSummary = buildQuotationPlanSummary({ quote, sentAt })
  const modalityComparison = buildModalityComparison({ quote, sentAt })
  const modalityDef = getVentasModalityDefinition(quote.billing_modality, {
    employeesCount: employees,
    currency: quote.currency,
    rules: quote.business_rules,
    tier: ruleOpts.tier,
    productKind: quote.product_kind,
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
      const pageH = doc.page.height
      const contentW = pageW - MARGIN * 2

      doc.rect(0, 0, pageW, pageH).fill(T.white)

      let y = drawHeader(doc, {
        pageW,
        contentW,
        title: isAnnual ? 'Cotización anual' : 'Cotización mensual',
        refLabel,
        issuedLabel: formatIssuedDate(sentAt),
      })

      y = drawParties(doc, {
        y: y + 22,
        contentW,
        companyName: companyName?.trim() || 'Su empresa',
        contactName: contactName?.trim() || 'Estimado cliente',
        countryLabel,
        tierLabel: planSummary.tierLabel,
        terminalsLabel: buildTerminalsDisplayLabel({
          terminalsCount: quote.terminals_count,
          includesTerminals,
          hardwareMode,
          includedCount: quote.terminals_included_count,
          extraCount: quote.terminals_extra_count,
        }),
      })

      y = drawDivider(doc, y + 14, contentW)

      y = drawFeaturesRow(doc, {
        y: y + 14,
        contentW,
        isAnnual,
        terminalsCount: quote.terminals_count,
        includesTerminals,
        hardwareMode,
        currency: quote.currency,
        includedCount: quote.terminals_included_count,
        extraCount: quote.terminals_extra_count,
        includedCap,
        hardwareSaleUnitPrice:
          quote.hardware_sale_unit_price ??
          (quote.business_rules?.hardware_sale_unit_price != null
            ? convertVentasMoney(
                quote.business_rules.hardware_sale_unit_price,
                VENTAS_PRICE_LIST_CURRENCY,
                quote.currency
              )
            : undefined),
        productKind: quote.product_kind,
      })

      y = drawPriceCard(doc, {
        y: y + 14,
        contentW,
        planSummary,
        modalityLabel: modalityDef.label,
      })

      y = drawSummaryTable(doc, {
        y: y + 18,
        contentW,
        planSummary,
        comparison: modalityComparison
          ? {
              label: modalityComparison.title,
              value: modalityComparison.totalValue,
              note: modalityComparison.equivalentNote || modalityComparison.footnote,
            }
          : null,
      })

      drawFooter(doc, {
        y: y + 18,
        pageH,
        contentW,
        bankDetails,
        isAnnual,
        includesTerminals,
        hardwareSaleTotal: quote.hardware_sale_total || 0,
        currency: quote.currency,
        productKind: quote.product_kind,
      })

      doc.end()
    } catch (e) {
      reject(e)
    }
  })
}

/** Standard PDF fonts only cover WinAnsi; swap glyphs that would render as garbage. */
function pdfText(text: string): string {
  return text.replace(/−/g, '-').replace(/≈/g, '~').replace(/→/g, '->')
}

function formatIssuedDate(date: Date): string {
  return date.toLocaleDateString('es-HN', {
    timeZone: HONDURAS_TIMEZONE,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function drawSectionTitle(doc: PDFKit.PDFDocument, text: string, x: number, y: number, width?: number) {
  doc.fillColor(T.primary).font('Helvetica-Bold').fontSize(TYPE.section).text(pdfText(text), x, y, { width })
}

function drawLabel(doc: PDFKit.PDFDocument, text: string, x: number, y: number) {
  doc.fillColor(T.text).font('Helvetica-Bold').fontSize(TYPE.label).text(text.toUpperCase(), x, y, {
    characterSpacing: 0.4,
  })
}

function drawDivider(doc: PDFKit.PDFDocument, y: number, contentW: number): number {
  doc.moveTo(MARGIN, y).lineTo(MARGIN + contentW, y).lineWidth(0.6).strokeColor(T.panelBorder).stroke()
  return y
}

/** Full-bleed brand band, like the commercial proposals sent by hand. Returns its bottom y. */
function drawHeader(
  doc: PDFKit.PDFDocument,
  params: { pageW: number; contentW: number; title: string; refLabel: string; issuedLabel: string }
): number {
  const { pageW, contentW, title, refLabel, issuedLabel } = params
  const bandH = 92
  const metaW = 200
  const metaX = MARGIN + contentW - metaW

  doc.rect(0, 0, pageW, bandH).fill(T.headerBg)

  doc.fillColor(T.white).font('Helvetica-Bold').fontSize(TYPE.brand).text('HUMANO SISU', MARGIN, 24)
  doc.fillColor(T.headerKicker).font('Helvetica').fontSize(TYPE.ref).text('Propuesta comercial', MARGIN, 40)
  doc.fillColor(T.white).font('Helvetica-Bold').fontSize(TYPE.title).text(title, MARGIN, 54)

  doc.fillColor(T.headerMeta).font('Helvetica').fontSize(TYPE.ref)
  doc.text(`Ref. ${refLabel}`, metaX, 26, { width: metaW, align: 'right' })
  doc.text(`Emisión: ${issuedLabel}`, metaX, 40, { width: metaW, align: 'right' })

  return bandH
}

function drawParties(
  doc: PDFKit.PDFDocument,
  params: {
    y: number
    contentW: number
    companyName: string
    contactName: string
    countryLabel: string
    tierLabel: string
    terminalsLabel: string
  }
): number {
  const { y, contentW, companyName, contactName, countryLabel, tierLabel, terminalsLabel } = params
  const colW = contentW / 2 - 12
  const colAX = MARGIN
  const colBX = MARGIN + contentW / 2 + 12

  drawLabel(doc, 'Cliente', colAX, y)
  doc.fillColor(T.textBody).font('Helvetica').fontSize(TYPE.value).text(contactName, colAX, y + 14, { width: colW })
  doc.fillColor(T.text).font('Helvetica-Bold').fontSize(TYPE.value).text(companyName, colAX, doc.y + 2, { width: colW })
  doc.fillColor(T.textBody).font('Helvetica').fontSize(TYPE.body).text(countryLabel, colAX, doc.y + 3, { width: colW })
  const colABottom = doc.y

  drawLabel(doc, 'Alcance', colBX, y)
  doc.fillColor(T.text).font('Helvetica-Bold').fontSize(TYPE.value).text(tierLabel, colBX, y + 14, { width: colW })
  doc
    .fillColor(T.textBody)
    .font('Helvetica')
    .fontSize(TYPE.body)
    .text(`Terminales: ${terminalsLabel}`, colBX, doc.y + 3, { width: colW })
  doc.fillColor(T.textBody).font('Helvetica').fontSize(TYPE.body).text('Proveedor: Humano SISU · humanosisu.net', colBX, doc.y + 3, {
    width: colW,
  })

  return Math.max(colABottom, doc.y)
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
    currency: QuotationQuote['currency']
    includedCount?: number
    extraCount?: number
    includedCap?: number
    hardwareSaleUnitPrice?: number
    productKind?: QuotationQuote['product_kind']
  }
): number {
  const {
    y,
    contentW,
    isAnnual,
    terminalsCount,
    includesTerminals,
    hardwareMode,
    currency,
    includedCount,
    extraCount,
    includedCap,
    hardwareSaleUnitPrice,
    productKind,
  } = params
  const labels = getContractIncludesLabels({
    isAnnual,
    terminalsCount,
    includesTerminals,
    hardwareMode,
    currency,
    includedCount,
    extraCount,
    includedCap,
    hardwareSaleUnitPrice,
    productKind,
  })
  const colGap = 24
  const colW = (contentW - colGap) / 2
  const rowGap = 5
  const listTop = y + 20
  const leftCol = labels.filter((_, i) => i % 2 === 0)
  const rightCol = labels.filter((_, i) => i % 2 === 1)

  drawSectionTitle(doc, 'Incluido en su contratación', MARGIN, y)

  const drawColumn = (items: string[], x: number): number => {
    let itemY = listTop
    for (const item of items) {
      doc.circle(x + 2.5, itemY + 4, 1.6).fill(T.primary)
      doc.fillColor(T.textBody).font('Helvetica').fontSize(TYPE.body)
      doc.text(pdfText(item), x + 10, itemY, { width: colW - 10, lineGap: 1 })
      itemY = doc.y + rowGap
    }
    return itemY
  }

  const leftBottom = drawColumn(leftCol, MARGIN)
  const rightBottom = drawColumn(rightCol, MARGIN + colW + colGap)
  return Math.max(leftBottom, rightBottom) - rowGap
}

function drawPriceCard(
  doc: PDFKit.PDFDocument,
  params: {
    y: number
    contentW: number
    planSummary: ReturnType<typeof buildQuotationPlanSummary>
    modalityLabel: string
  }
): number {
  const { y, contentW, planSummary, modalityLabel } = params
  const boxH = 66
  const innerX = MARGIN + 16
  const noteX = MARGIN + contentW * 0.48
  const noteW = contentW * 0.52 - 16

  doc.roundedRect(MARGIN, y, contentW, boxH, 6).fill(T.panelBg)

  doc
    .fillColor(T.textMuted)
    .font('Helvetica')
    .fontSize(TYPE.label)
    .text(`INVERSIÓN  (${modalityLabel.toLowerCase()})`, innerX, y + 12, { characterSpacing: 0.3 })
  doc.fillColor(T.primary).font('Helvetica-Bold').fontSize(TYPE.price).text(pdfText(planSummary.totalValue), innerX, y + 26, {
    width: noteX - innerX - 8,
  })

  doc.fillColor(T.textMuted).font('Helvetica').fontSize(TYPE.body).text(pdfText(planSummary.totalLabel), noteX, y + 30, {
    width: noteW,
  })

  return y + boxH
}

function drawSummaryTable(
  doc: PDFKit.PDFDocument,
  params: {
    y: number
    contentW: number
    planSummary: ReturnType<typeof buildQuotationPlanSummary>
    comparison: { label: string; value: string; note: string } | null
  }
): number {
  const { y, contentW, planSummary, comparison } = params
  const amountW = 170
  const labelW = contentW - amountW - 12
  const amountX = MARGIN + contentW - amountW

  drawSectionTitle(doc, 'Resumen de inversión', MARGIN, y)
  let rowY = drawDivider(doc, y + 18, contentW) + 8

  const row = (label: string, value: string, opts: { bold?: boolean; color?: string } = {}) => {
    const font = opts.bold ? 'Helvetica-Bold' : 'Helvetica'
    const color = opts.color ?? (opts.bold ? T.text : T.textBody)
    doc.fillColor(color).font(font).fontSize(TYPE.value)
    const h = Math.max(
      doc.heightOfString(pdfText(label), { width: labelW }),
      doc.heightOfString(pdfText(value), { width: amountW })
    )
    doc.text(pdfText(label), MARGIN, rowY, { width: labelW })
    doc.fillColor(color).font(font).fontSize(TYPE.value).text(pdfText(value), amountX, rowY, {
      width: amountW,
      align: 'right',
    })
    rowY += h + 7
  }

  for (const line of planSummary.lines) {
    row(line.label, line.value, line.variant === 'discount' ? { color: T.accentDark } : {})
  }
  row(planSummary.totalLabel, planSummary.totalValue, { bold: true })

  if (comparison) {
    row(comparison.label, comparison.value, { color: T.textMuted })
    doc.fillColor(T.textMuted).font('Helvetica').fontSize(TYPE.footnote).text(pdfText(comparison.note), MARGIN, rowY - 2, {
      width: contentW,
      lineGap: 1,
    })
    rowY = doc.y
  }

  return rowY
}

function drawFooter(
  doc: PDFKit.PDFDocument,
  params: {
    y: number
    pageH: number
    contentW: number
    bankDetails?: VentasBankDetails | null
    isAnnual: boolean
    includesTerminals: boolean
    hardwareSaleTotal?: number
    currency: QuotationQuote['currency']
    productKind?: QuotationQuote['product_kind']
  }
) {
  const { y, pageH, contentW, bankDetails, isAnnual, includesTerminals, hardwareSaleTotal, currency } = params
  const colGap = 24
  const colW = (contentW - colGap) / 2
  const paymentX = MARGIN + colW + colGap

  const implementationBody = isAnnual
    ? 'Tiempo de entrega en 3 a 5 días hábiles.'
    : 'Entrega en 3 a 5 días hábiles tras confirmar el depósito.'

  const paymentIntro = isAnnual
    ? annualPaymentIntroText({
        includesTerminals,
        hardwareSaleTotal,
        productKind: params.productKind,
      })
    : 'El siguiente paso es enviar el comprobante del 100% de la primera mensualidad (software + continuidad de hardware).'

  drawDivider(doc, y, contentW)
  const top = y + 14

  drawSectionTitle(doc, 'Tiempo de implementación', MARGIN, top, colW)
  doc.fillColor(T.textBody).font('Helvetica').fontSize(TYPE.body).text(implementationBody, MARGIN, top + 18, {
    width: colW,
    lineGap: 2,
  })
  doc
    .fillColor(T.textMuted)
    .font('Helvetica')
    .fontSize(TYPE.label)
    .text('Envíe comprobante por WhatsApp o responda al correo de cotización.', MARGIN, doc.y + 6, { width: colW })

  drawSectionTitle(doc, 'Modalidad de pago', paymentX, top, colW)
  doc.fillColor(T.textBody).font('Helvetica').fontSize(TYPE.body).text(pdfText(paymentIntro), paymentX, top + 18, {
    width: colW,
    lineGap: 2,
  })

  if (bankDetails) {
    let rowY = doc.y + 8
    doc.font('Helvetica').fillColor(T.textBody).fontSize(TYPE.label)
    if (bankDetails.clientName) {
      doc.text(`Titular: ${bankDetails.clientName}`, paymentX, rowY, { width: colW })
      rowY += 11
    }
    if (bankDetails.clientDni) {
      doc.text(`DNI: ${bankDetails.clientDni}`, paymentX, rowY, { width: colW })
      rowY += 11
    }
    doc.font('Courier').fontSize(TYPE.bankMono).fillColor(T.text)
    if (bankDetails.bacAccount) {
      doc.text(`BAC Credomatic   ${bankDetails.bacAccount}`, paymentX, rowY, { width: colW })
      rowY += 11
    }
    if (bankDetails.banpaisAccount) {
      doc.text(`Banpais          ${bankDetails.banpaisAccount}`, paymentX, rowY, { width: colW })
      rowY += 11
    }
    if (bankDetails.atlantidaAccount) {
      doc.text(`Atlántida        ${bankDetails.atlantidaAccount}`, paymentX, rowY, { width: colW })
    }
  } else {
    doc
      .fillColor(T.textMuted)
      .font('Helvetica')
      .fontSize(TYPE.body)
      .text('Solicite datos bancarios a su asesor al confirmar.', paymentX, doc.y + 8, { width: colW })
  }

  // Pinned to the page bottom so short quotes don't leave the footer floating mid-page.
  const footerY = pageH - 36
  drawDivider(doc, footerY - 10, contentW)
  doc.fillColor(T.textLight).font('Helvetica').fontSize(TYPE.footnote).text(
    `Humano SISU · humanosisu.net · Propuesta comercial · ${pricesInCurrencyFooter(currency)}`,
    MARGIN,
    footerY,
    { width: contentW, align: 'center', lineBreak: false }
  )
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
    heightOfString(text: string, options?: Record<string, unknown>): number
    y: number
    on(event: string, cb: (...args: unknown[]) => void): void
    end(): void
  }
}
