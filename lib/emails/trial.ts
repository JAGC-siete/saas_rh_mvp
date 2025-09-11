import { emailService } from '../email-service'
import { notificationManager } from '../notification-providers'

export interface TrialStartedEmailData {
  to: string
  company_id: string
  trialEnd: string
}

export async function sendTrialStartedEmail(data: TrialStartedEmailData) {
  const config = await notificationManager.getConfigForCompany(data.company_id)
  if (!config) {
    throw new Error('Email configuration not found')
  }

  const trialEndDate = new Date(data.trialEnd)
  const daysRemaining = Math.ceil((trialEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

  const content = {
    to: data.to,
    subject: '🚀 ¡Tu trial de 30 días ha comenzado! - Humano SISU',
    text: `¡Hola!

Tu trial de 30 días con Humano SISU ha comenzado exitosamente.

Tienes ${daysRemaining} días para explorar todas las funcionalidades:
• Gestión de empleados
• Control de asistencia
• Generación de planillas
• Envío de vouchers por email/WhatsApp

Fecha de expiración: ${trialEndDate.toLocaleDateString('es-HN')}

¿Necesitas ayuda? Responde este email o contáctanos.

¡Bienvenido a SISU!

El equipo de Humano SISU`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 28px;">🚀 ¡Trial Iniciado!</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Humano SISU - Sistema de Recursos Humanos</p>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #333; margin-top: 0;">¡Bienvenido a tu trial de 30 días!</h2>
          
          <p style="color: #666; line-height: 1.6;">
            Tu trial ha comenzado exitosamente. Tienes <strong>${daysRemaining} días</strong> 
            para explorar todas las funcionalidades de SISU.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
            <h3 style="color: #333; margin-top: 0;">¿Qué puedes hacer?</h3>
            <ul style="color: #666; line-height: 1.8;">
              <li>✅ Gestión completa de empleados</li>
              <li>✅ Control de asistencia con geofencing</li>
              <li>✅ Generación automática de planillas</li>
              <li>✅ Envío de vouchers por email/WhatsApp</li>
              <li>✅ Reportes y analytics</li>
            </ul>
          </div>
          
          <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <p style="margin: 0; color: #856404;">
              <strong>Fecha de expiración:</strong> ${trialEndDate.toLocaleDateString('es-HN')}
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://humanosisu.net'}/app/dashboard" 
               style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              Ir al Dashboard
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            ¿Necesitas ayuda? Responde este email o contáctanos.<br>
            ¡Estamos aquí para ayudarte a sacar el máximo provecho de SISU!
          </p>
        </div>
        
        <div style="background: #333; padding: 20px; text-align: center; color: #999; font-size: 12px;">
          <p style="margin: 0;">© 2025 Humano SISU. Todos los derechos reservados.</p>
        </div>
      </div>
    `
  }

  return await emailService.sendEmail(config, content)
}
