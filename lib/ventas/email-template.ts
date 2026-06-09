import type { CurrencyCode, QuotationQuote } from './types'
import { buildQuotationPlanSummary, buildUrgencyPriceDisplay } from './quote-display'
import type { VentasBankDetails } from './bank-details'
import {
  buildQuotationAcquisitionWhatsAppText,
  buildVentasSupportWhatsAppUrl,
} from './bank-details'
import { buildUrgencyOfferPitchText } from './modality-includes'
import { buildVentasRefLabel } from './brand-styles'
import { formatUrgencyOfferExpiryFriendly } from './urgency-offer'
import {
  buildClientFichaHtml,
  buildEmailHeaderBlock,
  buildPriceCardHtml,
  escapeVentasHtml,
} from './email-template-parts'
import { VENTAS_BRAND as B, buildTerminalsDisplayLabel } from './brand-styles'
import { getVentasModalityDefinition } from './modality-includes'

function firstNameFromContact(contactName?: string): string {
  const trimmed = contactName?.trim()
  if (!trimmed) return ''
  return trimmed.split(/\s+/)[0] || trimmed
}

export function generateVentasQuotationEmailSubject(params: {
  contactName?: string
  companyName?: string
  discountAmount: number
  currency: CurrencyCode
  urgencyActive?: boolean
}): string {
  const company = params.companyName?.trim()
  if (params.urgencyActive === false) {
    const firstName = firstNameFromContact(params.contactName)
    return firstName
      ? `Tu cotización Humano SISU, ${firstName}`
      : company
        ? `Tu cotización de Humano SISU para ${company} está lista`
        : 'Tu cotización Humano SISU'
  }
  if (company) {
    return `Tu cotización de Humano SISU para ${company} está lista (Descuento de 72h aplicado)`
  }
  const firstName = firstNameFromContact(params.contactName)
  return firstName
    ? `Tu cotización Humano SISU está lista, ${firstName} (Descuento de 72h aplicado)`
    : 'Tu cotización Humano SISU está lista (Descuento de 72h aplicado)'
}

export function generateVentasQuotationEmailHTML(params: {
  quote: QuotationQuote
  contactName?: string
  companyName?: string
  countryLabel: string
  sentAt?: Date
  now?: Date
  bankDetails?: VentasBankDetails | null
}) {
  const { quote, contactName, companyName, countryLabel, sentAt = new Date(), now } = params

  const supportWhatsAppUrl = buildVentasSupportWhatsAppUrl(
    buildQuotationAcquisitionWhatsAppText({
      contactName,
      companyName,
      includeBankPrompt: false,
    })
  )

  const firstName = firstNameFromContact(contactName)
  const opening = firstName
    ? `${escapeVentasHtml(firstName)}, aquí están tus números.`
    : 'Aquí están tus números.'

  const companyLabel = companyName?.trim() || 'tu empresa'
  const isAnnual = quote.billing_modality === 'annual'
  const summary = buildQuotationPlanSummary({ quote, sentAt, now })
  const quoteLabel = isAnnual ? 'COTIZACIÓN ANUAL' : 'COTIZACIÓN MENSUAL'
  const refLabel = buildVentasRefLabel(companyName, contactName)

  const urgencyPitch = summary.urgency.isActive
    ? `<p style="margin: 0 0 16px 0; line-height: 1.55; color: ${B.textBody}; font-size: 15px; font-family: Arial, Helvetica, sans-serif;">${escapeVentasHtml(buildUrgencyOfferPitchText(quote.billing_modality))}</p>`
    : ''

  return `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 560px; margin: 0 auto; padding: 20px; color: ${B.text}; background: #ffffff;">
      ${buildEmailHeaderBlock(quoteLabel, refLabel)}
      ${buildClientFichaHtml({
        companyName: companyLabel,
        contactName: contactName?.trim() || 'Estimado cliente',
        countryLabel,
        tierLabel: summary.tierLabel,
        terminalsCount: quote.terminals_count,
        isAnnual,
      })}
      <p style="margin: 0 0 14px 0; font-size: 18px; line-height: 1.4; font-weight: bold; color: ${B.text};">${opening}</p>
      ${urgencyPitch}
      ${buildPriceCardHtml({ quote, sentAt, now })}
      <div style="text-align: center; margin: 8px 0 0 0;">
        <a href="${supportWhatsAppUrl}" style="display: inline-block; padding: 14px 28px; background-color: ${B.accent}; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; font-family: Arial, Helvetica, sans-serif;">Continuar por WhatsApp</a>
      </div>
    </div>
  `
}

export function generateVentasQuotationEmailText(params: {
  quote: QuotationQuote
  contactName?: string
  companyName?: string
  countryLabel: string
  sentAt?: Date
  now?: Date
  bankDetails?: VentasBankDetails | null
}): string {
  const { quote, contactName, companyName, countryLabel, sentAt = new Date(), now } = params

  const firstName = firstNameFromContact(contactName)
  const opening = firstName ? `${firstName}, aquí están tus números.` : 'Aquí están tus números.'
  const companyLabel = companyName?.trim() || 'tu empresa'
  const summary = buildQuotationPlanSummary({ quote, sentAt, now })
  const modalityLabel = getVentasModalityDefinition(quote.billing_modality).label
  const isAnnual = quote.billing_modality === 'annual'
  const quoteLabel = isAnnual ? 'COTIZACIÓN ANUAL' : 'COTIZACIÓN MENSUAL'
  const refLabel = buildVentasRefLabel(companyName, contactName)
  const terminals = buildTerminalsDisplayLabel({
    terminalsCount: quote.terminals_count,
    isAnnual,
  })

  const lines: string[] = [
    'Humano SISU',
    `${quoteLabel} // REF: ${refLabel}`,
    '',
    `Atención: ${contactName?.trim() || 'Estimado cliente'}`,
    `Empresa: ${companyLabel}`,
    `Alcance: ${summary.tierLabel}`,
    `País: ${countryLabel}`,
    `# de terminales: ${terminals}`,
    '',
    opening,
    '',
  ]

  if (summary.urgency.isActive) {
    lines.push(buildUrgencyOfferPitchText(quote.billing_modality), '')
    const priceDisplay = buildUrgencyPriceDisplay({ quote, summary })
    if (priceDisplay) {
      lines.push(
        `${priceDisplay.listPriceLabel}: ${priceDisplay.listPriceValue}`,
        priceDisplay.investmentLabel,
        priceDisplay.totalValue,
        priceDisplay.savingsText,
        '',
        `⏳ Oferta vigente hasta el ${formatUrgencyOfferExpiryFriendly(summary.urgency.expiresAt)} (hora Honduras)`
      )
    }
  } else {
    lines.push(`${modalityLabel}`)
    for (const line of summary.lines) {
      lines.push(`${line.label}: ${line.value}`)
    }
    lines.push(`${summary.totalLabel}: ${summary.totalValue}`)
  }

  lines.push('', 'Comparativa de modalidades, condiciones y datos bancarios: PDF adjunto.')

  const waText = buildQuotationAcquisitionWhatsAppText({
    contactName,
    companyName,
    includeBankPrompt: false,
  })

  lines.push('', 'Continuar por WhatsApp:', buildVentasSupportWhatsAppUrl(waText))

  return lines.join('\n')
}
