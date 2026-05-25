import type { VentasBankDetails } from './bank-details'
import {
  buildBankDetailsInlineHtml,
  buildQuotationAcquisitionWhatsAppText,
  buildVentasSupportWhatsAppUrl,
} from './bank-details'

function firstNameFromContact(contactName?: string): string {
  const trimmed = contactName?.trim()
  if (!trimmed) return ''
  return trimmed.split(/\s+/)[0] || trimmed
}

export function generateVentasActivationEmailSubject(contactName?: string): string {
  const firstName = firstNameFromContact(contactName)
  if (firstName) return `Aquí tienes las llaves, ${firstName}.`
  return 'Aquí tienes las llaves.'
}

export function generateVentasActivationEmailHTML(params: {
  contactName?: string
  companyName?: string
  email: string
  password: string
  loginUrl: string
  bankDetails?: VentasBankDetails | null
}) {
  const firstName = firstNameFromContact(params.contactName)
  const greeting = firstName ? `Hola ${escapeHtml(firstName)},` : 'Hola,'

  const companyLabel = params.companyName?.trim()
    ? escapeHtml(params.companyName.trim())
    : 'tu empresa'

  const hasBankDetails = !!params.bankDetails
  const supportWhatsAppUrl = buildVentasSupportWhatsAppUrl(
    buildQuotationAcquisitionWhatsAppText({
      contactName: params.contactName,
      companyName: params.companyName,
      includeBankPrompt: hasBankDetails,
      context: 'activation',
    })
  )
  const bankBlock = params.bankDetails
    ? buildBankDetailsInlineHtml(params.bankDetails, params.contactName)
    : ''

  return `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #0b4fa1 0%, #1976d2 100%); padding: 26px; text-align: center; color: white; border-radius: 10px 10px 0 0;">
        <h1 style="margin: 0; font-size: 22px;">Humano SISU</h1>
        <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">Tu entorno está listo</p>
      </div>

      <div style="background: #f8f9fa; padding: 24px; border-radius: 0 0 10px 10px;">
        <p style="color: #333; margin-top: 0; line-height: 1.55;">${greeting}</p>
        <p style="color: #333; margin: 0 0 14px 0; line-height: 1.55;">
          Hicimos el trabajo pesado por ti. Tu entorno de prueba para <strong>${companyLabel}</strong> ya está 100% configurado y listo para usar.
        </p>
        <p style="color: #333; margin: 0 0 14px 0; line-height: 1.55;">
          Nada de teoría. Usa los accesos de abajo para entrar al panel, revisar tus parámetros y ver exactamente cómo funciona Humano SISU.
        </p>

        <div style="background: white; padding: 16px; border-radius: 10px; margin: 16px 0; border-left: 4px solid #0b4fa1;">
          <h3 style="color: #333; margin-top: 0;">Tus credenciales de acceso:</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; color: #666;">Email:</td>
              <td style="padding: 6px 0; text-align: right; color: #333;"><code>${escapeHtml(params.email)}</code></td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #666;">Contraseña:</td>
              <td style="padding: 6px 0; text-align: right; color: #333;"><code>${escapeHtml(params.password)}</code></td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin: 22px 0;">
          <a href="${escapeHtml(params.loginUrl)}"
             style="background: #0b4fa1; color: white; padding: 12px 26px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
            Entrar al panel ahora
          </a>
        </div>

        ${bankBlock}

        <div style="text-align: center; margin: 20px 0 8px 0;">
          <a href="${supportWhatsAppUrl}" style="display: inline-block; padding: 12px 24px; background-color: #25D366; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-family: Arial, sans-serif;">💬 Continuar contratación por WhatsApp</a>
        </div>

        <p style="color: #666; font-size: 12px; margin-top: 18px; line-height: 1.5;">
          <strong>Nota:</strong> Por tu propia seguridad, el sistema te pedirá cambiar la contraseña en cuanto entres. Te tomará 15 segundos.
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
