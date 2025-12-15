import { emailService } from '../email-service'
import { notificationManager } from '../notification-providers'

export interface MailListConfirmationEmailData {
  to: string
  confirmUrl: string
}

export async function sendMailListConfirmationEmail(data: MailListConfirmationEmailData) {
  // Get default config since this is a public subscription
  const config = await notificationManager.getConfigForCompany('default')
  if (!config) {
    const errorMsg = 'Email configuration not found - RESEND_API_KEY may be missing'
    console.error('❌', errorMsg)
    throw new Error(errorMsg)
  }

  // Validate that email provider is configured
  if (!config.emailProvider?.apiKey) {
    const errorMsg = 'RESEND_API_KEY not configured in email provider'
    console.error('❌', errorMsg)
    throw new Error(errorMsg)
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://humanosisu.net'
  // Extract token from confirmUrl (format: /api/mail-list/confirm?token=xxx)
  const tokenMatch = data.confirmUrl.match(/token=([^&]+)/)
  const token = tokenMatch ? tokenMatch[1] : ''
  const unsubscribeUrl = token ? `${siteUrl}/api/mail-list/unsubscribe?token=${token}` : `${siteUrl}/mail-list/unsubscribe`

  const content = {
    to: data.to,
    subject: '📧 Confirma tu suscripción - Humano SISU',
    text: `¡Hola!

Gracias por tu interés en Humano SISU, el sistema de recursos humanos más completo para empresas en Honduras.

Para confirmar tu suscripción y recibir nuestras actualizaciones, haz clic en el siguiente enlace:
${data.confirmUrl}

¿Qué recibirás?
• Actualizaciones sobre nuevas funcionalidades
• Consejos y mejores prácticas de recursos humanos
• Promociones especiales y ofertas
• Noticias sobre cumplimiento laboral en Honduras

Si no solicitaste esta suscripción, puedes ignorar este email o darte de baja usando el siguiente enlace:
${unsubscribeUrl}

¡Bienvenido a la comunidad Humano SISU!

El equipo de Humano SISU`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 28px;">📧 Confirma tu Suscripción</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Humano SISU - Sistema de Recursos Humanos</p>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #333; margin-top: 0;">¡Gracias por tu interés!</h2>
          
          <p style="color: #666; line-height: 1.6;">
            Gracias por tu interés en <strong>Humano SISU</strong>, el sistema de recursos humanos 
            más completo para empresas en Honduras.
          </p>
          
          <p style="color: #666; line-height: 1.6;">
            Para confirmar tu suscripción y comenzar a recibir nuestras actualizaciones directamente en tu correo, 
            haz clic en el botón de abajo:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.confirmUrl}" 
               style="background: #667eea; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px;">
              Confirmar Suscripción
            </a>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
            <h3 style="color: #333; margin-top: 0;">¿Qué recibirás?</h3>
            <ul style="color: #666; line-height: 1.8;">
              <li>✅ Actualizaciones sobre nuevas funcionalidades</li>
              <li>✅ Consejos y mejores prácticas de recursos humanos</li>
              <li>✅ Promociones especiales y ofertas</li>
              <li>✅ Noticias sobre cumplimiento laboral en Honduras</li>
            </ul>
          </div>
          
          <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <p style="margin: 0; color: #856404; font-size: 14px;">
              <strong>⚠️ Importante:</strong> Si no solicitaste esta suscripción, puedes 
              <a href="${unsubscribeUrl}" style="color: #856404; text-decoration: underline;">darte de baja aquí</a>.
            </p>
          </div>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            Sin spam. Solo contenido valioso para tu empresa.<br>
            ¿Preguntas? Responde este email o contáctanos.<br>
            <strong>¡Bienvenido a la comunidad Humano SISU!</strong>
          </p>
        </div>
        
        <div style="background: #333; padding: 20px; text-align: center; color: #999; font-size: 12px;">
          <p style="margin: 0;">© 2025 Humano SISU. Todos los derechos reservados.</p>
          <p style="margin: 10px 0 0 0;">
            <a href="${unsubscribeUrl}" style="color: #999; text-decoration: underline;">Darse de baja</a>
          </p>
        </div>
      </div>
    `
  }

  return await emailService.sendEmail(config, content)
}

