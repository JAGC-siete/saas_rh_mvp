import type { QuotationQuote } from './types'
import { buildQuotationPlanSummary, buildUrgencyPriceDisplay } from './quote-display'
import { getVentasModalityDefinition } from './modality-includes'
import { VENTAS_BRAND as B, buildTerminalsDisplayLabel } from './brand-styles'
import { formatUrgencyOfferExpiryFriendly } from './urgency-offer'

export function escapeVentasHtml(v: string): string {
  return v
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

export function buildEmailHeaderBlock(quoteLabel: string, refLabel: string): string {
  return `
    <div style="border-bottom: 3px solid ${B.primary}; padding-bottom: 14px; margin-bottom: 18px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
        <tr>
          <td style="font-family: Arial, Helvetica, sans-serif; font-size: 22px; font-weight: bold; color: ${B.primary}; vertical-align: bottom;">
            Humano SISU
          </td>
          <td style="font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: ${B.textMuted}; text-align: right; vertical-align: bottom; letter-spacing: 0.03em;">
            ${escapeVentasHtml(quoteLabel)}&nbsp;&nbsp;//&nbsp;&nbsp;REF: ${escapeVentasHtml(refLabel)}
          </td>
        </tr>
      </table>
    </div>
  `
}

export function buildClientFichaHtml(params: {
  companyName: string
  contactName: string
  countryLabel: string
  tierLabel: string
  terminalsCount: number
  isAnnual: boolean
}): string {
  const terminals = buildTerminalsDisplayLabel({
    terminalsCount: params.terminalsCount,
    isAnnual: params.isAnnual,
  })

  return `
    <div style="background: ${B.panelBgAlt}; border: 1px solid ${B.panelBorder}; border-radius: 8px; padding: 14px 16px; margin: 0 0 18px 0; font-family: Arial, Helvetica, sans-serif;">
      <p style="margin: 0 0 12px 0; font-size: 11px; color: ${B.textMuted}; text-transform: uppercase; letter-spacing: 0.04em;">
        Atención: ${escapeVentasHtml(params.contactName)}
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
        <tr>
          <td width="50%" style="padding: 0 8px 4px 0; font-size: 10px; color: ${B.textMuted}; text-transform: uppercase; letter-spacing: 0.04em;">Empresa</td>
          <td width="50%" style="padding: 0 0 4px 0; font-size: 10px; color: ${B.textMuted}; text-transform: uppercase; letter-spacing: 0.04em;">Alcance</td>
        </tr>
        <tr>
          <td style="padding: 0 8px 10px 0; font-size: 14px; font-weight: bold; color: ${B.text}; vertical-align: top;">${escapeVentasHtml(params.companyName)}</td>
          <td style="padding: 0 0 10px 0; font-size: 14px; font-weight: bold; color: ${B.text}; vertical-align: top;">${escapeVentasHtml(params.tierLabel)}</td>
        </tr>
        <tr>
          <td style="padding: 0 8px 4px 0; font-size: 10px; color: ${B.textMuted}; text-transform: uppercase; letter-spacing: 0.04em;">País</td>
          <td style="padding: 0 0 4px 0; font-size: 10px; color: ${B.textMuted}; text-transform: uppercase; letter-spacing: 0.04em;"># de terminales</td>
        </tr>
        <tr>
          <td style="padding: 0 8px 0 0; font-size: 14px; color: ${B.textBody}; vertical-align: top;">${escapeVentasHtml(params.countryLabel)}</td>
          <td style="padding: 0; font-size: 14px; color: ${B.textBody}; vertical-align: top;">${escapeVentasHtml(terminals)}</td>
        </tr>
      </table>
    </div>
  `
}

export function buildPriceCardHtml(params: {
  quote: QuotationQuote
  sentAt?: Date
  now?: Date
  showPdfNote?: boolean
}): string {
  const { showPdfNote = true } = params
  const summary = buildQuotationPlanSummary(params)
  const modalityLabel = getVentasModalityDefinition(params.quote.billing_modality).label

  let inner = ''
  if (summary.urgency.isActive) {
    const priceDisplay = buildUrgencyPriceDisplay({ quote: params.quote, summary })

    if (priceDisplay) {
      inner += `<p style="margin: 0 0 4px 0; font-size: 12px; color: ${B.textMuted};">${escapeVentasHtml(priceDisplay.listPriceLabel)}</p>`
      inner += `<p style="margin: 0 0 12px 0; font-size: 14px; color: ${B.textMuted}; text-decoration: line-through;">${escapeVentasHtml(priceDisplay.listPriceValue)}</p>`
      inner += `<p style="margin: 0 0 8px 0; font-size: 13px; font-weight: bold; color: ${B.textBody};">${escapeVentasHtml(priceDisplay.investmentLabel)}</p>`
      inner += `<p style="margin: 0 0 8px 0; font-size: 26px; font-weight: bold; color: ${B.accent}; line-height: 1.2;">${escapeVentasHtml(priceDisplay.totalValue)}</p>`
      inner += `<p style="margin: 0; font-size: 13px; color: ${B.accentDark};">${escapeVentasHtml(priceDisplay.savingsText)}</p>`
    }
  } else {
    for (const line of summary.lines) {
      inner += `<p style="margin: 0 0 6px 0; font-size: 13px; color: ${B.textBody};">${escapeVentasHtml(line.label)}: ${escapeVentasHtml(line.value)}</p>`
    }
    inner += `<p style="margin: 8px 0 4px 0; font-size: 24px; font-weight: bold; color: ${B.accent};">${escapeVentasHtml(summary.totalValue)}</p>`
    inner += `<p style="margin: 0; font-size: 13px; font-weight: bold; color: ${B.text};">${escapeVentasHtml(summary.totalLabel)}</p>`
  }

  const expiryBlock = summary.expiryText
    ? `<div style="background: ${B.urgencyBg}; border: 1px solid ${B.urgencyBorder}; border-radius: 6px; padding: 10px 12px; margin: 14px 0 0 0; text-align: center; font-size: 12px; color: ${B.urgencyText}; font-weight: bold;">⏳ Oferta vigente hasta el ${escapeVentasHtml(formatUrgencyOfferExpiryFriendly(summary.urgency.expiresAt))} (hora Honduras)</div>`
    : ''

  const pdfNote = showPdfNote
    ? `<p style="margin: 14px 0 0 0; font-size: 12px; color: ${B.textMuted};">Comparativa de modalidades, condiciones y datos bancarios: PDF adjunto.</p>`
    : ''

  return `
    <div style="background: ${B.panelBg}; border: 1px solid ${B.panelBorder}; border-left: 4px solid ${B.primary}; border-radius: 8px; padding: 18px 20px; margin: 0 0 16px 0; font-family: Arial, Helvetica, sans-serif;">
      <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: bold; color: ${B.primary}; text-transform: uppercase; letter-spacing: 0.05em;">Inversión</p>
      <p style="margin: 0 0 14px 0; font-size: 12px; color: ${B.textMuted};">${escapeVentasHtml(modalityLabel)}</p>
      ${inner}
      ${expiryBlock}
      ${pdfNote}
    </div>
  `
}
