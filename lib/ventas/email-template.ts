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

function buildPlanSummary(params: {
  quote: QuotationQuote
  urgency: ReturnType<typeof computeUrgencyOffer>
  fmt: (n: number) => string
  isMonthly: boolean
  quotedTotal: number
  periodLabel: string
  terminalsNote: string
  couponLine: string
}): string {
  const { quote, urgency, fmt, isMonthly, quotedTotal, periodLabel, terminalsNote, couponLine } = params

  if (urgency.isActive) {
    return `
      <div style="background: #f6f8fa; padding: 18px 20px; border-radius: 8px; margin: 22px 0;">
        <p style="margin: 0 0 14px 0; font-size: 15px; font-weight: bold; color: #111;">
          Resumen de cotización (${quote.tier.min_employees} a ${quote.tier.max_employees} empleados):
        </p>
        <ul style="margin: 0; padding: 0 0 0 18px; color: #333; font-size: 14px; line-height: 1.7;">
          ${!isMonthly ? `<li style="margin-bottom: 8px;"><strong>Subtotal anual:</strong> ${fmt(quote.annual_subtotal)} / ${periodLabel}</li>` : ''}
          ${couponLine}
          ${isMonthly ? `<li style="margin-bottom: 8px;"><strong>Total mensual cotizado:</strong> ${fmt(quotedTotal)} / ${periodLabel}</li>` : `<li style="margin-bottom: 8px;"><strong>Total anual cotizado:</strong> ${fmt(quotedTotal)} / ${periodLabel}</li>`}
          <li style="margin-bottom: 8px;"><strong>Descuento por contratación en 72 h (20%):</strong> −${fmt(urgency.discountAmount)} / ${periodLabel}</li>
          <li style="margin-bottom: 0;">
            <strong>Precio con descuento:</strong>
            <span style="color: #0d5c2f; font-weight: bold;"> ${fmt(urgency.discountedTotal)} / ${periodLabel}</span>
            <span style="color: #555;"> (${terminalsNote})</span>
          </li>
        </ul>
      </div>
      <p style="margin: 0 0 18px 0; font-size: 14px; line-height: 1.55; color: #333;">
        ⏳ <strong>Esta oferta expira el ${escapeHtml(formatUrgencyOfferExpiryFriendly(urgency.expiresAt))}</strong> (hora Honduras).
      </p>
    `
  }

  return `
    <div style="background: #f6f8fa; padding: 18px 20px; border-radius: 8px; margin: 22px 0;">
      <p style="margin: 0 0 14px 0; font-size: 15px; font-weight: bold; color: #111;">
        Resumen de cotización (${quote.tier.min_employees} a ${quote.tier.max_employees} empleados):
      </p>
      <ul style="margin: 0; padding: 0 0 0 18px; color: #333; font-size: 14px; line-height: 1.7;">
        ${!isMonthly ? `<li style="margin-bottom: 8px;"><strong>Subtotal anual:</strong> ${fmt(quote.annual_subtotal)} / ${periodLabel}</li>` : ''}
        ${couponLine}
        <li style="margin-bottom: 8px;"><strong>Total ${isMonthly ? 'mensual' : 'anual'} cotizado:</strong> ${fmt(quotedTotal)} / ${periodLabel}</li>
        ${!isMonthly ? `<li style="margin-bottom: 0;"><strong>Terminales:</strong> ${quote.terminals_count} · ${terminalsNote}</li>` : ''}
      </ul>
    </div>
  `
}

export function generateVentasQuotationEmailHTML(params: {
  quote: QuotationQuote
  contactName?: string
  companyName?: string
  countryLabel: string
  sentAt?: Date
  bankDetails?: VentasBankDetails | null
}) {
  const { quote, contactName, companyName, countryLabel, sentAt = new Date(), bankDetails } = params
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
  const urgency = computeUrgencyOffer({ quotedTotal, sentAt })
  const periodLabel = isMonthly ? 'mes' : 'año'

  const terminalsNote = isMonthly
    ? `Incluye ${quote.terminals_count} terminal${quote.terminals_count === 1 ? '' : 'es'} con continuidad de hardware según tu cotización.`
    : 'Incluye hasta 3 terminales sin cargo mensual extra de continuidad.'

  const couponLine =
    !isMonthly && quote.coupon_applied
      ? `<li style="margin-bottom: 8px;"><strong>Descuento por cupón:</strong> −${fmt(quote.annual_discount_amount)} / ${periodLabel}</li>`
      : ''

  const planSummary = buildPlanSummary({
    quote,
    urgency,
    fmt,
    isMonthly,
    quotedTotal,
    periodLabel,
    terminalsNote,
    couponLine,
  })

  const offerParagraph = urgency.isActive
    ? `<p style="margin: 0 0 18px 0; line-height: 1.6; color: #333;">
        Si contratas en las próximas <strong>72 horas</strong>, aplicamos un <strong>20% de descuento</strong> sobre el total ${isMonthly ? 'mensual' : 'anual'} cotizado. El PDF adjunto refleja los mismos montos de este resumen.
      </p>`
    : `<p style="margin: 0 0 18px 0; line-height: 1.6; color: #333;">
        El PDF adjunto refleja el mismo desglose de montos que ves en este correo.
      </p>`

  const closingParagraph = urgency.isActive
    ? `<p style="margin: 0 0 22px 0; line-height: 1.6; color: #333;">
        Si los números te hacen sentido, puedes entrar al panel o escribirnos por WhatsApp para confirmar datos bancarios y formalizar la contratación.
      </p>`
    : `<p style="margin: 0 0 22px 0; line-height: 1.6; color: #333;">
        Si los números te hacen sentido, entra a tu panel o contáctanos para continuar con la contratación.
      </p>`

  const bankBlock = bankDetails ? buildBankDetailsInlineHtml(bankDetails, contactName) : ''
  const ctaLabel = urgency.isActive ? 'Entrar al panel y continuar' : 'Entrar al panel'

  return `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 640px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
      <div style="border-bottom: 3px solid #0b4fa1; padding-bottom: 16px; margin-bottom: 20px;">
        <p style="margin: 0; font-size: 14px; color: #555; letter-spacing: 0.02em;">Humano SISU</p>
      </div>

      <p style="margin: 0 0 16px 0; font-size: 18px; line-height: 1.45; font-weight: bold; color: #111;">${opening}</p>

      <p style="margin: 0 0 14px 0; line-height: 1.6; color: #333;">
        Tu cotización para <strong>${companyLabel}</strong> está calculada para operar con las reglas de nómina y zona horaria de <strong>${escapeHtml(countryLabel)}</strong>.
      </p>

      ${offerParagraph}
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
  bankDetails?: VentasBankDetails | null
}): string {
  const { quote, contactName, companyName, countryLabel, sentAt = new Date(), bankDetails } = params
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://humanosisu.net').replace(/\/$/, '')

  const firstName = firstNameFromContact(contactName)
  const opening = firstName ? `${firstName}, aquí están tus números.` : 'Aquí están tus números.'
  const companyLabel = companyName?.trim() || 'tu empresa'
  const fmt = (n: number) => formatMoney(quote.currency, n)
  const isMonthly = quote.billing_modality === 'monthly'
  const quotedTotal = isMonthly ? quote.monthly_total : quote.annual_total
  const urgency = computeUrgencyOffer({ quotedTotal, sentAt })
  const periodLabel = isMonthly ? 'mes' : 'año'

  const lines: string[] = [
    'Humano SISU',
    '',
    opening,
    '',
    `Tu cotización para ${companyLabel} está calculada para operar con las reglas de nómina y zona horaria de ${countryLabel}.`,
    '',
  ]

  if (urgency.isActive) {
    lines.push(
      'Si contratas en las próximas 72 horas, aplicamos un 20% de descuento sobre el total cotizado. El PDF adjunto refleja los mismos montos de este resumen.',
      '',
      `Resumen (${quote.tier.min_employees} a ${quote.tier.max_employees} empleados):`
    )
    if (!isMonthly) lines.push(`- Subtotal anual: ${fmt(quote.annual_subtotal)} / ${periodLabel}`)
    if (!isMonthly && quote.coupon_applied) {
      lines.push(`- Descuento por cupón: −${fmt(quote.annual_discount_amount)} / ${periodLabel}`)
    }
    lines.push(
      `- Total ${isMonthly ? 'mensual' : 'anual'} cotizado: ${fmt(quotedTotal)} / ${periodLabel}`,
      `- Descuento por contratación en 72 h (20%): −${fmt(urgency.discountAmount)} / ${periodLabel}`,
      `- Precio con descuento: ${fmt(urgency.discountedTotal)} / ${periodLabel}`,
      '',
      `Esta oferta expira el ${formatUrgencyOfferExpiryFriendly(urgency.expiresAt)} (hora Honduras).`,
      '',
      'Si los números te hacen sentido, entra al panel o escríbenos por WhatsApp para confirmar datos bancarios y formalizar la contratación.'
    )
  } else {
    lines.push(
      'El PDF adjunto refleja el mismo desglose de montos que ves en este correo.',
      '',
      `Resumen (${quote.tier.min_employees} a ${quote.tier.max_employees} empleados):`,
      `- Total ${isMonthly ? 'mensual' : 'anual'} cotizado: ${fmt(quotedTotal)} / ${periodLabel}`,
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
