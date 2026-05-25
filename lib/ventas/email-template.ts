import type { CurrencyCode, QuotationQuote } from './types'
import { formatMoney } from './pricing'
import {
  computeUrgencyOffer,
  formatUrgencyOfferExpiryFriendly,
  formatUrgencyOfferSavings,
} from './urgency-offer'
import type { VentasBankDetails } from './bank-details'
import {
  buildBankDetailsInlineHtml,
  buildBankDetailsPlainText,
  buildQuotationAcquisitionWhatsAppText,
  buildVentasSupportWhatsAppUrl,
} from './bank-details'
import {
  buildModalityPerksSummaryLines,
  buildUrgencyOfferPitchText,
  getVentasModalityDefinition,
} from './modality-includes'

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
  discountAmount: number
  currency: CurrencyCode
  urgencyActive?: boolean
}): string {
  const firstName = firstNameFromContact(params.contactName)
  if (params.urgencyActive === false) {
    return firstName ? `Tu cotización Humano SISU, ${firstName}` : 'Tu cotización Humano SISU'
  }
  const savings = formatUrgencyOfferSavings(params.currency, params.discountAmount)
  if (firstName) return `Tus números (y cómo ahorrarte ${savings}), ${firstName}.`
  return `Tus números (y cómo ahorrarte ${savings}).`
}

function buildPerksListHtml(modality: QuotationQuote['billing_modality']): string {
  const def = getVentasModalityDefinition(modality)
  const items = buildModalityPerksSummaryLines(modality)
    .map((line) => `<li style="margin-bottom: 5px;">${escapeHtml(line)}</li>`)
    .join('')
  return `
    <p style="margin: 14px 0 8px 0; font-size: 14px; font-weight: bold; color: #111;">Lo que incluye tu ${escapeHtml(def.label)}:</p>
    <ul style="margin: 0; padding: 0 0 0 18px; color: #333; font-size: 14px; line-height: 1.65;">${items}</ul>
  `
}

function buildPlanSummary(params: {
  quote: QuotationQuote
  urgency: ReturnType<typeof computeUrgencyOffer>
  fmt: (n: number) => string
  isMonthly: boolean
  quotedTotal: number
  periodLabel: string
}): string {
  const { quote, urgency, fmt, isMonthly, quotedTotal, periodLabel } = params
  const perksHtml = buildPerksListHtml(quote.billing_modality)
  const tierLabel = `${quote.tier.min_employees} a ${quote.tier.max_employees} empleados`

  if (urgency.isActive) {
    const savingsNote = `Es decir, te ahorras ${fmt(urgency.discountAmount)} de inmediato al contratar en las próximas 72 horas.`
    return `
      <div style="background: #f6f8fa; padding: 18px 20px; border-radius: 8px; margin: 22px 0;">
        <p style="margin: 0 0 14px 0; font-size: 15px; font-weight: bold; color: #111;">
          El resumen de tu plan (${tierLabel}):
        </p>
        <ul style="margin: 0; padding: 0 0 0 18px; color: #333; font-size: 14px; line-height: 1.7;">
          <li style="margin-bottom: 8px;"><strong>Precio normal:</strong> ${fmt(quotedTotal)} / ${periodLabel}</li>
          <li style="margin-bottom: 8px;"><strong>Descuento por contratación en 72 h (20%):</strong> −${fmt(urgency.discountAmount)} / ${periodLabel}</li>
          <li style="margin-bottom: 8px;">
            <strong>Tu precio hoy:</strong>
            <span style="color: #0d5c2f; font-weight: bold;"> ${fmt(urgency.discountedTotal)} / ${periodLabel}</span>
            <span style="color: #555;"> (${escapeHtml(savingsNote)})</span>
          </li>
        </ul>
        ${perksHtml}
      </div>
      <p style="margin: 0 0 18px 0; font-size: 14px; line-height: 1.55; color: #333;">
        ⏳ <strong>Esta oferta expira el ${escapeHtml(formatUrgencyOfferExpiryFriendly(urgency.expiresAt))}</strong> (hora Honduras).
      </p>
    `
  }

  return `
    <div style="background: #f6f8fa; padding: 18px 20px; border-radius: 8px; margin: 22px 0;">
      <p style="margin: 0 0 14px 0; font-size: 15px; font-weight: bold; color: #111;">
        El resumen de tu plan (${tierLabel}):
      </p>
      <ul style="margin: 0; padding: 0 0 0 18px; color: #333; font-size: 14px; line-height: 1.7;">
        <li style="margin-bottom: 8px;"><strong>Total ${isMonthly ? 'mensual' : 'anual'} cotizado:</strong> ${fmt(quotedTotal)} / ${periodLabel}</li>
      </ul>
      ${perksHtml}
    </div>
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
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://humanosisu.net').replace(/\/$/, '')

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

  const fmt = (n: number) => formatMoney(quote.currency, n)
  const isMonthly = quote.billing_modality === 'monthly'
  const quotedTotal = isMonthly ? quote.monthly_total : quote.annual_total
  const urgency = computeUrgencyOffer({ quotedTotal, sentAt, now })
  const periodLabel = isMonthly ? 'mes' : 'año'
  const modality = quote.billing_modality

  const planSummary = buildPlanSummary({
    quote,
    urgency,
    fmt,
    isMonthly,
    quotedTotal,
    periodLabel,
  })

  const urgencyPitch = urgency.isActive
    ? `<p style="margin: 0 0 18px 0; line-height: 1.6; color: #333;">${escapeHtml(buildUrgencyOfferPitchText(modality))}</p>`
    : ''

  const pdfNote = urgency.isActive
    ? `<p style="margin: 0 0 18px 0; line-height: 1.6; color: #333;">
        Tienes el PDF adjunto con el precio de lista y los detalles técnicos de tu plan. El <strong>20% de descuento por contratar en 72 horas</strong> aparece solo en este correo; un asesor lo aplica al formalizar dentro del plazo.
      </p>`
    : `<p style="margin: 0 0 18px 0; line-height: 1.6; color: #333;">
        El PDF adjunto refleja el mismo desglose de montos que ves en este correo.
      </p>`

  const closingParagraph = urgency.isActive
    ? `<p style="margin: 0 0 22px 0; line-height: 1.6; color: #333;">
        Si los números te hacen sentido y quieres asegurar este precio, entra a tu panel ahora. Un asesor confirmará los últimos detalles operativos contigo y aplicará el descuento.
      </p>`
    : `<p style="margin: 0 0 22px 0; line-height: 1.6; color: #333;">
        Si los números te hacen sentido, entra a tu panel o contáctanos para continuar con la contratación.
      </p>`

  const bankBlock = bankDetails ? buildBankDetailsInlineHtml(bankDetails, contactName) : ''
  const ctaLabel = urgency.isActive ? 'Entrar al panel y asegurar precio' : 'Entrar al panel'

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
      ${pdfNote}
      ${planSummary}
      ${closingParagraph}
      ${bankBlock}

      <div style="text-align: center; margin: 24px 0;">
        <a href="${siteUrl}/app/login" style="background: #0b4fa1; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 700; font-size: 15px;">${ctaLabel}</a>
      </div>
      <div style="text-align: center; margin: 20px 0;">
        <a href="${supportWhatsAppUrl}" style="display: inline-block; padding: 12px 24px; background-color: #25D366; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-family: Arial, sans-serif;">💬 Continuar contratación por WhatsApp</a>
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
  const { quote, contactName, companyName, countryLabel, sentAt = new Date(), now, bankDetails } = params
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://humanosisu.net').replace(/\/$/, '')

  const firstName = firstNameFromContact(contactName)
  const opening = firstName ? `${firstName}, aquí están tus números.` : 'Aquí están tus números.'
  const companyLabel = companyName?.trim() || 'tu empresa'
  const fmt = (n: number) => formatMoney(quote.currency, n)
  const isMonthly = quote.billing_modality === 'monthly'
  const quotedTotal = isMonthly ? quote.monthly_total : quote.annual_total
  const urgency = computeUrgencyOffer({ quotedTotal, sentAt, now })
  const periodLabel = isMonthly ? 'mes' : 'año'
  const modality = quote.billing_modality
  const def = getVentasModalityDefinition(modality)
  const tierLabel = `${quote.tier.min_employees} a ${quote.tier.max_employees} empleados`

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

  if (urgency.isActive) {
    lines.push(
      buildUrgencyOfferPitchText(modality),
      '',
      'Tienes el PDF adjunto con el precio de lista y los detalles técnicos. El 20% por contratar en las próximas 72 horas aparece solo en este correo; un asesor lo aplica al formalizar dentro del plazo.',
      '',
      `El resumen de tu plan (${tierLabel}):`,
      `Precio normal: ${fmt(quotedTotal)} / ${periodLabel}`,
      `Descuento por contratación en 72 h (20%): −${fmt(urgency.discountAmount)} / ${periodLabel}`,
      `Tu precio hoy: ${fmt(urgency.discountedTotal)} / ${periodLabel}`,
      `Te ahorras ${fmt(urgency.discountAmount)} de inmediato al contratar en las próximas 72 horas.`,
      '',
      `Lo que incluye tu ${def.label}:`,
      ...buildModalityPerksSummaryLines(modality),
      '',
      `Esta oferta expira el ${formatUrgencyOfferExpiryFriendly(urgency.expiresAt)} (hora Honduras).`,
      '',
      'Si los números te hacen sentido y quieres asegurar este precio, entra a tu panel ahora. Un asesor confirmará los últimos detalles operativos contigo y aplicará el descuento.'
    )
  } else {
    lines.push(
      'El PDF adjunto refleja el mismo desglose de montos que ves en este correo.',
      '',
      `El resumen de tu plan (${tierLabel}):`,
      `Total ${isMonthly ? 'mensual' : 'anual'} cotizado: ${fmt(quotedTotal)} / ${periodLabel}`,
      '',
      `Lo que incluye tu ${def.label}:`,
      ...buildModalityPerksSummaryLines(modality),
      '',
      'Si los números te hacen sentido, entra a tu panel o contáctanos para continuar con la contratación.'
    )
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
    `Entrar al panel: ${siteUrl}/app/login`,
    '',
    'Continuar contratación por WhatsApp:',
    buildVentasSupportWhatsAppUrl(waText)
  )

  return lines.join('\n')
}
