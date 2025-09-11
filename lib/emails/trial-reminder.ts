import { emailService } from '../email-service'
import { notificationManager } from '../notification-providers'

export interface TrialReminderEmailData {
  to: string
  companyName: string
  daysRemaining: number
  trialEnd: string
}

export async function sendTrialReminderEmail(data: TrialReminderEmailData) {
  const config = await notificationManager.getConfigForCompany('default')
  if (!config) {
    throw new Error('Email configuration not found')
  }

  const trialEndDate = new Date(data.trialEnd)
  const isUrgent = data.daysRemaining <= 3
  const urgencyColor = isUrgent ? '#dc3545' : '#ffc107'
  const urgencyIcon = isUrgent ? '🚨' : '⏰'

  const content = {
    to: data.to,
    subject: `${urgencyIcon} Trial ${data.daysRemaining === 1 ? 'expira mañana' : `expira en ${data.daysRemaining} días`} - ${data.companyName}`,
    text: `¡Hola!

${isUrgent ? '¡ATENCIÓN!' : 'Recordatorio importante:'} Tu trial de Humano SISU ${isUrgent ? 'expira mañana' : `expira en ${data.daysRemaining} días`}.

Empresa: ${data.companyName}
Fecha de expiración: ${trialEndDate.toLocaleDateString('es-HN')}

${isUrgent 
  ? '¡No pierdas acceso a todas las funcionalidades de SISU! Activa tu plan ahora para continuar usando:'
  : 'Para continuar usando todas las funcionalidades de SISU después de la expiración, activa tu plan:'
}

• Gestión de empleados
• Control de asistencia
• Generación de planillas
• Envío de vouchers
• Reportes y analytics

¿Cómo activar tu plan?
1. Ve a Configuración > Billing en tu dashboard
2. Registra tu pago manual
3. ¡Listo! Tu plan se activará inmediatamente

¿Necesitas ayuda? Responde este email o contáctanos.

¡Gracias por confiar en SISU!

El equipo de Humano SISU`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, ${urgencyColor} 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 28px;">${urgencyIcon} ${isUrgent ? '¡Trial Expira Pronto!' : 'Recordatorio de Trial'}</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Humano SISU - Sistema de Recursos Humanos</p>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #333; margin-top: 0;">
            ${isUrgent ? '¡ATENCIÓN!' : 'Recordatorio importante:'} 
            Tu trial ${isUrgent ? 'expira mañana' : `expira en ${data.daysRemaining} días`}
          </h2>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${urgencyColor};">
            <p style="color: #666; margin: 0 0 10px 0;"><strong>Empresa:</strong> ${data.companyName}</p>
            <p style="color: #666; margin: 0;"><strong>Fecha de expiración:</strong> ${trialEndDate.toLocaleDateString('es-HN')}</p>
          </div>
          
          <p style="color: #666; line-height: 1.6;">
            ${isUrgent 
              ? '¡No pierdas acceso a todas las funcionalidades de SISU! Activa tu plan ahora para continuar usando:'
              : 'Para continuar usando todas las funcionalidades de SISU después de la expiración, activa tu plan:'
            }
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">¿Qué incluye tu plan?</h3>
            <ul style="color: #666; line-height: 1.8;">
              <li>✅ Gestión completa de empleados</li>
              <li>✅ Control de asistencia con geofencing</li>
              <li>✅ Generación automática de planillas</li>
              <li>✅ Envío de vouchers por email/WhatsApp</li>
              <li>✅ Reportes y analytics avanzados</li>
            </ul>
          </div>
          
          <div style="background: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff;">
            <h3 style="color: #333; margin-top: 0;">¿Cómo activar tu plan?</h3>
            <ol style="color: #666; line-height: 1.8;">
              <li>Ve a <strong>Configuración > Billing</strong> en tu dashboard</li>
              <li>Registra tu pago manual (transferencia, efectivo, etc.)</li>
              <li>¡Listo! Tu plan se activará inmediatamente</li>
            </ol>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://humanosisu.net'}/app/settings" 
               style="background: ${urgencyColor}; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px;">
              ${isUrgent ? '¡Activar Plan Ahora!' : 'Activar Plan'}
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            ¿Necesitas ayuda? Responde este email o contáctanos.<br>
            ¡Estamos aquí para ayudarte a continuar con SISU!
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
