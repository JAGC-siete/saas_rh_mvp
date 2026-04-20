import type { QuotationQuote } from './types'
import { formatMoney } from './pricing'

export function generateVentasQuotationEmailSubject(companyName?: string): string {
  const suffix = companyName?.trim() ? ` — ${companyName.trim()}` : ''
  return `Tu cotización de SISU${suffix}`
}

export function generateVentasQuotationEmailHTML(params: {
  quote: QuotationQuote
  contactName?: string
  companyName?: string
}) {
  const { quote, contactName, companyName } = params
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://humanosisu.net').replace(/\/$/, '')
  const salesWhatsApp = (process.env.NEXT_PUBLIC_SALES_WHATSAPP || '').trim()
  const waNumber = salesWhatsApp.replace(/[^\d]/g, '')
  const waText = encodeURIComponent('Hola, solicité mi cotización SISU. ¿Me ayudas a confirmar modalidad y terminales?')
  const waUrl = waNumber ? `https://wa.me/${waNumber}?text=${waText}` : ''

  const greeting = contactName?.trim()
    ? `Hola, ${escapeHtml(contactName.trim())}`
    : 'Hola'

  const fmt = (n: number) => formatMoney(quote.currency, n)

  return `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #0b4fa1 0%, #1976d2 100%); padding: 26px; text-align: center; color: white; border-radius: 10px 10px 0 0;">
        <h1 style="margin: 0; font-size: 22px;">Humano SISU</h1>
        <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">Cotización automática</p>
      </div>

      <div style="background: #f8f9fa; padding: 24px; border-radius: 0 0 10px 10px;">
        <p style="color: #333; margin-top: 0;">${greeting}${companyName?.trim() ? `, para <strong>${escapeHtml(companyName.trim())}</strong>` : ''}.</p>
        <p style="color: #333;">Adjuntamos tu cotización en PDF. Aquí tienes un resumen:</p>

        <div style="background: white; padding: 16px; border-radius: 10px; margin: 16px 0; border-left: 4px solid #0b4fa1;">
          <h3 style="color: #333; margin-top: 0;">Resumen</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; color: #666;">Rango:</td>
              <td style="padding: 6px 0; text-align: right; color: #333;">${quote.tier.min_employees}–${quote.tier.max_employees} empleados</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #666;">Subtotal:</td>
              <td style="padding: 6px 0; text-align: right; color: #333;">${fmt(quote.annual_subtotal)} / año</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #666;">Descuento:</td>
              <td style="padding: 6px 0; text-align: right; color: #333;">${quote.coupon_applied ? `-${fmt(quote.annual_discount_amount)}` : fmt(0)} / año</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #666; font-weight: bold;">Total:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: bold; color: #2e7d32;">${fmt(quote.annual_total)} / año</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #666;">Modalidad mensual:</td>
              <td style="padding: 6px 0; text-align: right; color: #333;">${fmt(quote.monthly_total)} / mes</td>
            </tr>
            ${
              quote.billing_modality === 'monthly'
                ? `<tr>
                     <td style="padding: 6px 0; color: #666;">Incluye continuidad hardware:</td>
                     <td style="padding: 6px 0; text-align: right; color: #333;">${fmt(quote.monthly_hardware_fee)} / mes (${quote.terminals_count} terminal${quote.terminals_count === 1 ? '' : 'es'})</td>
                   </tr>`
                : `<tr>
                     <td style="padding: 6px 0; color: #666;">Terminales (anual):</td>
                     <td style="padding: 6px 0; text-align: right; color: #333;">Primeras 2 terminales sin fee mensual</td>
                   </tr>`
            }
          </table>
        </div>

        <div style="text-align: center; margin: 22px 0;">
          <a href="${siteUrl}/activar"
             style="background: #0b4fa1; color: white; padding: 12px 26px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
            Activar gratis
          </a>
        </div>

        ${
          waUrl
            ? `<div style="text-align: center; margin: 10px 0 0 0;">
                 <p style="color: #333; margin: 0 0 10px 0;">¿Quieres avanzar más rápido?</p>
                 <a href="${waUrl}"
                    style="background: #10b981; color: #052e2b; padding: 12px 22px; text-decoration: none; border-radius: 999px; display: inline-block; font-weight: bold;">
                   Escribir por WhatsApp
                 </a>
               </div>`
            : ''
        }

        <p style="color: #666; font-size: 12px; margin-top: 18px;">
          Nota: Esta cotización es automática y orientativa. Un asesor puede confirmar alcance y tiempos según tus necesidades.
        </p>
      </div>
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

