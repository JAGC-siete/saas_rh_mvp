import type { CurrencyCode, QuotationQuote } from './types'
import { buildQuotationPlanSummary } from './quote-display'
import type { VentasBankDetails } from './bank-details'
import {
  buildBankDetailsInlineHtml,
  buildBankDetailsPlainText,
  buildQuotationAcquisitionWhatsAppText,
  buildVentasSupportWhatsAppUrl,
} from './bank-details'
import { buildUrgencyOfferPitchText } from './modality-includes'

function firstNameFromContact(contactName?: string): string {
  const trimmed = contactName?.trim()
  if (!trimmed) return ''
  return trimmed.split(/\s+/)[0] || trimmed
}

function escapeHtml(v: string): string {
  return v
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
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

function buildPlanSummary(params: {
  quote: QuotationQuote
  sentAt?: Date
  now?: Date
}): string {
  const summary = buildQuotationPlanSummary(params)
  const lineItems = summary.lines
    .map(
      (line) =>
        `<li style="margin-bottom: 8px;"><strong>${escapeHtml(line.label)}:</strong> ${escapeHtml(line.value)}</li>`
    )
    .join('')

  const totalColor = summary.urgency.isActive ? '#0d5c2f' : '#111'
  const expiryBlock = summary.expiryText
    ? `<p style="margin: 0 0 18px 0; font-size: 14px; line-height: 1.55; color: #333;">⏳ <strong>${escapeHtml(summary.expiryText)}</strong></p>`
    : ''

  return `
    <div style="background: #f6f8fa; padding: 18px 20px; border-radius: 8px; margin: 22px 0;">
      <p style="margin: 0 0 14px 0; font-size: 15px; font-weight: bold; color: #111;">
        El resumen de tu plan (${escapeHtml(summary.tierLabel)}):
      </p>
      <ul style="margin: 0; padding: 0 0 0 18px; color: #333; font-size: 14px; line-height: 1.7;">
        ${lineItems}
      </ul>
      <p style="margin: 14px 0 0 0; font-size: 16px; font-weight: bold; color: ${totalColor};">
        ${escapeHtml(summary.totalLabel)}: ${escapeHtml(summary.totalValue)}
      </p>
      <p style="margin: 10px 0 0 0; font-size: 13px; color: #555;">
        (${escapeHtml(summary.pdfNote)})
      </p>
    </div>
    ${expiryBlock}
  `
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
  const { quote, contactName, companyName, countryLabel, sentAt = new Date(), now, bankDetails } = params

  const hasBankDetails = !!bankDetails
  const supportWhatsAppUrl = buildVentasSupportWhatsAppUrl(
    buildQuotationAcquisitionWhatsAppText({
      contactName,
      companyName,
      includeBankPrompt: hasBankDetails,
    })
  )

  const firstName = firstNameFromContact(contactName)
  const opening = firstName
    ? `${escapeHtml(firstName)}, aquí están tus números.`
    : 'Aquí están tus números.'

  const companyLabel = companyName?.trim()
    ? escapeHtml(companyName.trim())
    : 'tu empresa'

  const planSummary = buildPlanSummary({ quote, sentAt, now })
  const summary = buildQuotationPlanSummary({ quote, sentAt, now })
  const modality = quote.billing_modality

  const urgencyPitch = summary.urgency.isActive
    ? `<p style="margin: 0 0 18px 0; line-height: 1.6; color: #333;">${escapeHtml(buildUrgencyOfferPitchText(modality))}</p>`
    : ''

  const bankBlock = bankDetails ? buildBankDetailsInlineHtml(bankDetails, contactName) : ''
  const closingThanks = `<p style="margin: 24px 0 0 0; font-size: 14px; line-height: 1.6; color: #555;">Gracias por tu interés en el servicio Hondureño de RRHH.</p>`

  return `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 640px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
      <div style="border-bottom: 3px solid #0b4fa1; padding-bottom: 16px; margin-bottom: 20px;">
        <p style="margin: 0; font-size: 14px; color: #555; letter-spacing: 0.02em;">Humano SISU</p>
      </div>

      <p style="margin: 0 0 16px 0; font-size: 18px; line-height: 1.45; font-weight: bold; color: #111;">${opening}</p>

      <p style="margin: 0 0 14px 0; line-height: 1.6; color: #333;">
        Hicimos el trabajo pesado. Tu cotización para <strong>${companyLabel}</strong> ya está calculada y el sistema está configurado para operar con las reglas de nómina y zona horaria de <strong>${escapeHtml(countryLabel)}</strong>.
      </p>

      <p style="margin: 0 0 14px 0; line-height: 1.6; color: #333;">
        Vamos directo a lo que importa.
      </p>

      ${urgencyPitch}
      ${planSummary}
      ${bankBlock}

      <div style="text-align: center; margin: 24px 0;">
        <a href="${supportWhatsAppUrl}" style="display: inline-block; padding: 14px 28px; background-color: #25D366; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; font-family: Arial, sans-serif;">💬 Continuar contratación por WhatsApp</a>
      </div>
      ${closingThanks}
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
  const { quote, contactName, companyName, countryLabel, sentAt = new Date(), now, bankDetails } = params

  const firstName = firstNameFromContact(contactName)
  const opening = firstName ? `${firstName}, aquí están tus números.` : 'Aquí están tus números.'
  const companyLabel = companyName?.trim() || 'tu empresa'
  const modality = quote.billing_modality
  const summary = buildQuotationPlanSummary({ quote, sentAt, now })

  const lines: string[] = [
    'Humano SISU',
    '',
    opening,
    '',
    `Hicimos el trabajo pesado. Tu cotización para ${companyLabel} ya está calculada y el sistema está configurado para operar con las reglas de nómina y zona horaria de ${countryLabel}.`,
    '',
    'Vamos directo a lo que importa.',
    '',
  ]

  if (summary.urgency.isActive) {
    lines.push(buildUrgencyOfferPitchText(modality), '')
  }

  lines.push(`El resumen de tu plan (${summary.tierLabel}):`)
  for (const line of summary.lines) {
    lines.push(`• ${line.label}: ${line.value}`)
  }
  lines.push(
    `${summary.totalLabel}: ${summary.totalValue}`,
    `(${summary.pdfNote}).`
  )
  if (summary.expiryText) {
    lines.push('', summary.expiryText)
  }

  if (bankDetails) {
    lines.push('', buildBankDetailsPlainText(bankDetails))
  }

  const waText = buildQuotationAcquisitionWhatsAppText({
    contactName,
    companyName,
    includeBankPrompt: !!bankDetails,
  })

  lines.push(
    '',
    'Continuar contratación por WhatsApp:',
    buildVentasSupportWhatsAppUrl(waText),
    '',
    'Gracias por tu interés en el servicio Hondureño de RRHH.'
  )

  return lines.join('\n')
}
