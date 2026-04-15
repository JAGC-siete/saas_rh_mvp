import { emailService } from '../email-service'
import { notificationManager } from '../notification-providers'

export interface InviteEmailData {
  to: string
  inviteUrl: string
  companyName: string
  role: string
}

export async function sendInviteEmail(data: InviteEmailData) {
  // For invites, we need to get a default config since the user isn't in the company yet
  const config = await notificationManager.getConfigForCompany('default')
  if (!config) {
    throw new Error('Email configuration not found')
  }

  const roleDisplayNames = {
    employee: 'Empleado',
    manager: 'Gerente',
    hr_manager: 'Gerente de RRHH'
  }

  const content = {
    to: data.to,
    subject: `🎯 Te invitaron a ${data.companyName} - Humano SISU`,
    text: `¡Hola!

Has sido invitado a unirte a ${data.companyName} en Humano SISU como ${roleDisplayNames[data.role as keyof typeof roleDisplayNames] || data.role}.

Humano SISU es el sistema de recursos humanos más completo para empresas en El Salvador, Guatemala y Honduras.

Para aceptar la invitación, haz clic en el siguiente enlace:
${data.inviteUrl}

Este enlace expirará en 7 días.

¿Qué es Humano SISU?
• Gestión completa de empleados
• Control de asistencia con geofencing
• Generación automática de planillas
• Envío de vouchers por email/WhatsApp
• Reportes y analytics

Si no tienes una cuenta, se creará automáticamente al aceptar la invitación.

¡Bienvenido al equipo!

El equipo de Humano SISU`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 28px;">🎯 ¡Invitación a Equipo!</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Humano SISU - Sistema de Recursos Humanos</p>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #333; margin-top: 0;">¡Te invitaron a unirte!</h2>
          
          <p style="color: #666; line-height: 1.6;">
            Has sido invitado a unirte a <strong>${data.companyName}</strong> en Humano SISU 
            como <strong>${roleDisplayNames[data.role as keyof typeof roleDisplayNames] || data.role}</strong>.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
            <h3 style="color: #333; margin-top: 0;">¿Qué es Humano SISU?</h3>
            <ul style="color: #666; line-height: 1.8;">
              <li>✅ Gestión completa de empleados</li>
              <li>✅ Control de asistencia con geofencing</li>
              <li>✅ Generación automática de planillas</li>
              <li>✅ Envío de vouchers por email/WhatsApp</li>
              <li>✅ Reportes y analytics</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.inviteUrl}" 
               style="background: #667eea; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px;">
              Aceptar Invitación
            </a>
          </div>
          
          <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <p style="margin: 0; color: #856404; font-size: 14px;">
              <strong>⏰ Importante:</strong> Este enlace expirará en 7 días.
            </p>
          </div>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            Si no tienes una cuenta, se creará automáticamente al aceptar la invitación.<br>
            ¿Preguntas? Responde este email o contáctanos.
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
