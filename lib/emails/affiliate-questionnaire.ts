import { emailService } from '../email-service'
import { notificationManager } from '../notification-providers'

export interface AffiliateQuestionnaireEmailData {
  to: string
  questionnaireUrl: string
}

export async function sendAffiliateQuestionnaireEmail(data: AffiliateQuestionnaireEmailData) {
  // Get default config since this is a public subscription
  const config = await notificationManager.getConfigForCompany('default')
  if (!config) {
    throw new Error('Email configuration not found')
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://humanosisu.net'

  const content = {
    to: data.to,
    subject: '📋 Completa tu solicitud de afiliación - Humano SISU',
    text: `¡Hola!

Gracias por tu interés en convertirte en afiliado de Humano SISU, el sistema de recursos humanos más completo para empresas en Honduras.

Para completar tu solicitud de afiliación, necesitamos que completes un breve cuestionario haciendo clic en el siguiente enlace:
${data.questionnaireUrl}

¿Qué necesitas hacer?
• Completa el formulario con tu información profesional
• Acepta los términos y condiciones del programa de afiliados
• Envía tu solicitud para revisión

Una vez que completes el cuestionario, revisaremos tu solicitud y te contactaremos pronto.

Si no solicitaste ser afiliado, puedes ignorar este email.

¡Esperamos trabajar contigo!

El equipo de Humano SISU`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 28px;">📋 Completa tu Solicitud</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Programa de Afiliados - Humano SISU</p>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #333; margin-top: 0;">¡Gracias por tu interés!</h2>
          
          <p style="color: #666; line-height: 1.6;">
            Gracias por tu interés en convertirte en <strong>afiliado de Humano SISU</strong>, 
            el sistema de recursos humanos más completo para empresas en Honduras.
          </p>
          
          <p style="color: #666; line-height: 1.6;">
            Para completar tu solicitud de afiliación, necesitamos que completes un breve cuestionario. 
            Haz clic en el botón de abajo para continuar:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.questionnaireUrl}" 
               style="background: #667eea; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px;">
              Completar Cuestionario
            </a>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
            <h3 style="color: #333; margin-top: 0;">¿Qué necesitas hacer?</h3>
            <ul style="color: #666; line-height: 1.8;">
              <li>✅ Completa el formulario con tu información profesional</li>
              <li>✅ Acepta los términos y condiciones del programa de afiliados</li>
              <li>✅ Envía tu solicitud para revisión</li>
            </ul>
          </div>
          
          <div style="background: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196F3;">
            <h3 style="color: #333; margin-top: 0;">💡 Beneficios del Programa</h3>
            <ul style="color: #666; line-height: 1.8;">
              <li>Comisiones recurrentes por cada cliente referido</li>
              <li>Estructura de comisiones escalonada</li>
              <li>Bonos de rendimiento</li>
              <li>Soporte dedicado</li>
            </ul>
          </div>
          
          <p style="color: #666; line-height: 1.6;">
            Una vez que completes el cuestionario, revisaremos tu solicitud y te contactaremos pronto. 
            Si tu solicitud es aprobada, recibirás un email con tus credenciales de acceso.
          </p>
          
          <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <p style="margin: 0; color: #856404; font-size: 14px;">
              <strong>⚠️ Importante:</strong> Si no solicitaste ser afiliado, puedes ignorar este email.
            </p>
          </div>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            ¿Preguntas? Responde este email o contáctanos.<br>
            <strong>¡Esperamos trabajar contigo!</strong>
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








