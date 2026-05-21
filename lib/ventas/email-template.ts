import type { CurrencyCode, QuotationQuote } from './types'
import { formatMoney } from './pricing'
import {
  computeUrgencyOffer,
  formatUrgencyOfferExpiryFriendly,
  formatUrgencyOfferSavings,
} from './urgency-offer'

function firstNameFromContact(contactName?: string): string {
  const trimmed = contactName?.trim()
  if (!trimmed) return ''
  return trimmed.split(/\s+/)[0] || trimmed
}

export function generateVentasQuotationEmailSubject(params: {
  contactName?: string
  discountAmount: number
  currency: CurrencyCode
}): string {
  const firstName = firstNameFromContact(params.contactName)
  const savings = formatUrgencyOfferSavings(params.currency, params.discountAmount)
  if (firstName) return `Tus números (y cómo ahorrarte ${savings}), ${firstName}.`
  return `Tus números (y cómo ahorrarte ${savings}).`
}

export function generateVentasQuotationEmailHTML(params: {
  quote: QuotationQuote
  contactName?: string
  companyName?: string
  /** Ej. Honduras, El Salvador, Guatemala */
  countryLabel: string
  /** Momento de envío; inicia la ventana de 72 h para el descuento por pronta contratación. */
  sentAt?: Date
}) {
  const { quote, contactName, companyName, countryLabel, sentAt = new Date() } = params
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://humanosisu.net').replace(/\/$/, '')
  const salesWhatsApp = (process.env.NEXT_PUBLIC_SALES_WHATSAPP || '').trim()
  const waNumber = salesWhatsApp.replace(/[^\d]/g, '')
  const waText = encodeURIComponent(
    'Hola. Revisé mi cotización de Humano SISU y quiero entrar al panel para reclamar el descuento del 20%.'
  )
  const waUrl = waNumber ? `https://wa.me/${waNumber}?text=${waText}` : ''

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
    : `Es decir, te ahorras ${fmt(urgency.discountAmount)} de inmediato. Además, ya te incluimos hasta 3 terminales sin ningún cargo mensual extra.`

  const planSummary = urgency.isActive
    ? `
      <div style="background: #f6f8fa; padding: 18px 20px; border-radius: 8px; margin: 22px 0;">
        <p style="margin: 0 0 14px 0; font-size: 15px; font-weight: bold; color: #111;">
          El resumen de tu plan (${quote.tier.min_employees} a ${quote.tier.max_employees} empleados):
        </p>
        <ul style="margin: 0; padding: 0 0 0 18px; color: #333; font-size: 14px; line-height: 1.7;">
          <li style="margin-bottom: 8px;"><strong>Precio normal:</strong> ${fmt(urgency.quotedTotal)} / ${periodLabel}</li>
          <li style="margin-bottom: 8px;"><strong>Descuento por acción rápida:</strong> −${fmt(urgency.discountAmount)} / ${periodLabel}</li>
          <li style="margin-bottom: 0;">
            <strong>Tu precio hoy:</strong>
            <span style="color: #0d5c2f; font-weight: bold;"> ${fmt(urgency.discountedTotal)} / ${periodLabel}</span>
            <span style="color: #555;"> (${terminalsNote})</span>
          </li>
        </ul>
      </div>

      <p style="margin: 0 0 18px 0; font-size: 14px; line-height: 1.55; color: #333;">
        ⏳ <strong>Esta oferta expira exactamente el ${escapeHtml(formatUrgencyOfferExpiryFriendly(urgency.expiresAt))}</strong> (Hora de Honduras).
      </p>
    `
    : `
      <div style="background: #f6f8fa; padding: 18px 20px; border-radius: 8px; margin: 22px 0;">
        <p style="margin: 0 0 14px 0; font-size: 15px; font-weight: bold; color: #111;">
          El resumen de tu plan (${quote.tier.min_employees} a ${quote.tier.max_employees} empleados):
        </p>
        <ul style="margin: 0; padding: 0 0 0 18px; color: #333; font-size: 14px; line-height: 1.7;">
          <li style="margin-bottom: 8px;"><strong>Total ${isMonthly ? 'mensual estimado' : 'anual (software)'}:</strong> ${fmt(quotedTotal)} / ${periodLabel}</li>
          ${!isMonthly ? `<li style="margin-bottom: 0;"><strong>Terminales:</strong> ${quote.terminals_count} · hasta 3 incluidas sin cargo mensual de continuidad</li>` : ''}
        </ul>
      </div>
    `

  const offerParagraph = urgency.isActive
    ? `
      <p style="margin: 0 0 18px 0; line-height: 1.6; color: #333;">
        Queremos que tomes la decisión sin fricciones. Por eso, si contratas tu licencia en las próximas
        <strong>72 horas</strong>, te aplicamos un <strong>20% de descuento directo</strong> sobre el total ${isMonthly ? 'mensual' : 'anual'}.
      </p>
    `
    : ''

  const closingParagraph = urgency.isActive
    ? `
      <p style="margin: 0 0 22px 0; line-height: 1.6; color: #333;">
        Si los números te hacen sentido y quieres asegurar este precio, entra a tu panel ahora.
        Un asesor confirmará los últimos detalles operativos contigo y aplicará el descuento.
      </p>
    `
    : `
      <p style="margin: 0 0 22px 0; line-height: 1.6; color: #333;">
        Si los números te hacen sentido, entra a tu panel para revisar el entorno configurado con tus parámetros.
        Un asesor puede confirmar alcance e implementación contigo.
      </p>
    `

  const ctaLabel = urgency.isActive ? 'Entrar al panel y reclamar descuento' : 'Entrar al panel'

  return `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 640px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
      <div style="border-bottom: 3px solid #0b4fa1; padding-bottom: 16px; margin-bottom: 20px;">
        <p style="margin: 0; font-size: 14px; color: #555; letter-spacing: 0.02em;">Humano SISU</p>
      </div>

      <p style="margin: 0 0 16px 0; font-size: 18px; line-height: 1.45; font-weight: bold; color: #111;">${opening}</p>

      <p style="margin: 0 0 14px 0; line-height: 1.6; color: #333;">
        Hicimos el trabajo pesado. Tu cotización para <strong>${companyLabel}</strong> ya está calculada
        y el sistema está configurado para operar con las reglas de nómina y zona horaria de <strong>${escapeHtml(countryLabel)}</strong>.
      </p>

      <p style="margin: 0 0 18px 0; line-height: 1.6; color: #333;">
        Tienes el PDF adjunto con los detalles técnicos, pero vamos directo a lo que importa.
      </p>

      ${offerParagraph}
      ${planSummary}
      ${closingParagraph}

      <div style="text-align: center; margin: 24px 0;">
        <a href="${siteUrl}/app/login"
           style="background: #0b4fa1; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 700; font-size: 15px;">
          ${ctaLabel}
        </a>
      </div>

      ${
        waUrl
          ? `<div style="text-align: center; margin: 16px 0 0 0;">
               <p style="margin: 0 0 10px 0; font-size: 13px; color: #555;">¿Prefieres hablar con alguien antes de entrar?</p>
               <a href="${waUrl}"
                  style="display: inline-block; padding: 10px 20px; text-decoration: none; border-radius: 999px; font-weight: 600; font-size: 14px; border: 1px solid #0f766e; color: #0f766e;">
                 WhatsApp comercial
               </a>
             </div>`
          : ''
      }
    </div>
  `
}

function escapeHtml(v: string): string {
  return v
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}
