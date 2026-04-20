import type { QuotationQuote } from './types'
import { formatMoney } from './pricing'

export function generateVentasQuotationEmailSubject(companyName?: string): string {
  const suffix = companyName?.trim() ? ` — ${companyName.trim()}` : ''
  return `Cotización Humano SISU${suffix}`
}

export function generateVentasQuotationEmailHTML(params: {
  quote: QuotationQuote
  contactName?: string
  companyName?: string
  /** Ej. Honduras, El Salvador, Guatemala */
  countryLabel: string
}) {
  const { quote, contactName, companyName, countryLabel } = params
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://humanosisu.net').replace(/\/$/, '')
  const salesWhatsApp = (process.env.NEXT_PUBLIC_SALES_WHATSAPP || '').trim()
  const waNumber = salesWhatsApp.replace(/[^\d]/g, '')
  const waText = encodeURIComponent(
    'Hola. Recibí la cotización de Humano SISU por correo y quiero revisar alcance o implementación.'
  )
  const waUrl = waNumber ? `https://wa.me/${waNumber}?text=${waText}` : ''

  const greeting = contactName?.trim()
    ? `Buen día, ${escapeHtml(contactName.trim())}`
    : 'Buen día'

  const fmt = (n: number) => formatMoney(quote.currency, n)
  const isMonthly = quote.billing_modality === 'monthly'

  return `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 640px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
      <div style="border-bottom: 3px solid #0b4fa1; padding-bottom: 16px; margin-bottom: 20px;">
        <p style="margin: 0; font-size: 14px; color: #555; letter-spacing: 0.02em;">Humano SISU</p>
        <h1 style="margin: 8px 0 0 0; font-size: 20px; color: #111;">Cotización</h1>
      </div>

      <p style="margin: 0 0 14px 0; line-height: 1.55;">${greeting}${companyName?.trim() ? ` — <strong>${escapeHtml(companyName.trim())}</strong>` : ''}.</p>
      <p style="margin: 0 0 18px 0; line-height: 1.55;">
        Adjuntamos el PDF con el detalle. El importe del software se calculó según la plantilla y la modalidad indicadas;
        el país de operación queda registrado como <strong>${escapeHtml(countryLabel)}</strong> (reglas de nómina y zona horaria acordes a esa jurisdicción en el producto).
      </p>

      <div style="background: #f6f8fa; padding: 16px 18px; border-radius: 8px; margin: 18px 0;">
        <p style="margin: 0 0 12px 0; font-size: 13px; font-weight: bold; color: #333;">Resumen</p>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 6px 0; color: #555;">País de operación</td>
            <td style="padding: 6px 0; text-align: right;">${escapeHtml(countryLabel)}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #555;">Empleados (rango tarifario)</td>
            <td style="padding: 6px 0; text-align: right;">${quote.tier.min_employees}–${quote.tier.max_employees}</td>
          </tr>
            ${
              isMonthly
                ? `
              <tr>
                <td style="padding: 6px 0; color: #555;">Software (mensual)</td>
                <td style="padding: 6px 0; text-align: right;">${fmt(quote.monthly_software_total)} / mes</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #555;">Continuidad de hardware</td>
                <td style="padding: 6px 0; text-align: right;">${fmt(quote.monthly_hardware_fee)} / mes (${quote.terminals_count} terminal${quote.terminals_count === 1 ? '' : 'es'})</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #333; font-weight: bold;">Total mensual estimado</td>
                <td style="padding: 6px 0; text-align: right; font-weight: bold; color: #0d5c2f;">${fmt(quote.monthly_total)} / mes</td>
              </tr>
            `
                : `
              <tr>
                <td style="padding: 6px 0; color: #555;">Subtotal anual (software)</td>
                <td style="padding: 6px 0; text-align: right;">${fmt(quote.annual_subtotal)} / año</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #555;">Descuento${quote.coupon_applied ? ' (cupón)' : ''}</td>
                <td style="padding: 6px 0; text-align: right;">${quote.coupon_applied ? `−${fmt(quote.annual_discount_amount)}` : fmt(0)} / año</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #333; font-weight: bold;">Total anual (software)</td>
                <td style="padding: 6px 0; text-align: right; font-weight: bold; color: #0d5c2f;">${fmt(quote.annual_total)} / año</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #555;">Terminales (modalidad anual)</td>
                <td style="padding: 6px 0; text-align: right;">${quote.terminals_count} · hasta 3 incluidas sin cargo mensual de continuidad</td>
              </tr>
            `
            }
        </table>
      </div>

      <div style="text-align: center; margin: 24px 0;">
        <a href="${siteUrl}/app/login"
           style="background: #0b4fa1; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 14px;">
          Acceso al panel
        </a>
      </div>

      ${
        waUrl
          ? `<div style="text-align: center; margin: 16px 0 0 0;">
               <p style="margin: 0 0 10px 0; font-size: 14px; color: #444;">Para dudas sobre alcance o contratación:</p>
               <a href="${waUrl}"
                  style="display: inline-block; padding: 10px 20px; text-decoration: none; border-radius: 999px; font-weight: 600; font-size: 14px; border: 1px solid #0f766e; color: #0f766e;">
                 WhatsApp comercial
               </a>
             </div>`
          : ''
      }

      <p style="color: #666; font-size: 12px; line-height: 1.5; margin-top: 22px;">
        Esta cotización es orientativa; un asesor puede confirmar alcance, integraciones y calendario según su operación.
      </p>
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
