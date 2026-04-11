import { emailService } from '../email-service'
import { notificationManager } from '../notification-providers'

export interface AffiliateWelcomeEmailData {
  to: string
  email: string
  referralCode: string
  loginUrl: string
}

/**
 * Correo de bienvenida sin contraseña: el afiliado define clave vía invitación Supabase.
 */
export async function sendAffiliateWelcomeEmail(data: AffiliateWelcomeEmailData) {
  const config = await notificationManager.getConfigForCompany('default')
  if (!config) {
    throw new Error('Email configuration not found')
  }

  const content = {
    to: data.to,
    subject: '¡Bienvenido al Programa de Afiliados! - Humano SISU',
    text: `¡Felicitaciones!

Tu solicitud de afiliación ha sido aprobada.

IMPORTANTE: Revisá tu bandeja (y spam): recibirás otro correo de Humano SISU / Supabase con un enlace para definir tu contraseña de acceso. No compartas ese enlace.

CÓDIGO DE REFERIDO:
${data.referralCode}

Cuando ya tengas contraseña, iniciá sesión en: ${data.loginUrl}

Compartí tu código con empresas interesadas y ganá comisiones.

El equipo de Humano SISU`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 28px;">¡Bienvenido al Programa!</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Tu solicitud ha sido aprobada</p>
        </div>

        <div style="padding: 30px; background: #f8f9fa;">
          <p style="color: #666; line-height: 1.6;">
            Ya sos parte del <strong>Programa de Afiliados de Humano SISU</strong>.
          </p>

          <div style="background: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196F3;">
            <h3 style="color: #333; margin-top: 0;">Definir tu contraseña</h3>
            <p style="color: #666; margin-bottom: 0; line-height: 1.6;">
              Recibirás un <strong>correo aparte</strong> con un enlace seguro para crear tu contraseña.
              Revisá spam o promociones si no lo ves en la bandeja principal.
            </p>
          </div>

          <div style="background: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196F3;">
            <h3 style="color: #333; margin-top: 0;">Tu código de referido</h3>
            <div style="background: white; padding: 15px; border-radius: 6px; text-align: center; margin-top: 10px;">
              <p style="margin: 0; font-size: 24px; font-weight: bold; color: #667eea; font-family: monospace; letter-spacing: 2px;">
                ${data.referralCode}
              </p>
            </div>
          </div>

          <div style="text-align: center; margin: 24px 0;">
            <a href="${data.loginUrl}"
               style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              Ir al inicio de sesión
            </a>
          </div>

          <p style="color: #666; font-size: 14px; margin-top: 24px;">
            ¿Preguntas? Respondé este correo o contactanos.<br>
            <strong>¡Éxitos!</strong>
          </p>
        </div>

        <div style="background: #333; padding: 20px; text-align: center; color: #999; font-size: 12px;">
          <p style="margin: 0;">© Humano SISU. Todos los derechos reservados.</p>
        </div>
      </div>
    `
  }

  return await emailService.sendEmail(config, content)
}
