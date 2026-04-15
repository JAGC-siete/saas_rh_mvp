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
    subject: 'Completa tu cuestionario de afiliación (programa 2026) - Humano SISU',
    text: `¡Hola!

Gracias por tu interés en el programa de afiliados de Humano SISU: comisiones recurrentes por cada cliente que refieras, ayudando a llevar una solución de RRHH a más empresas en Honduras.

Resumen del programa (como en la página de afiliados):
• Estructura de comisiones 2026: 10% por tu primer negocio cerrado; +1% por cada nuevo negocio hasta un tope del 20%. El nivel que alcances se mantiene fijo durante todo 2026.
• Bono de rendimiento 2026: +5% de comisiones adicionales durante todo 2026 si cierras 10 negocios antes del 1 de febrero de 2026.
• Reglas: la comisión se paga sobre el valor anual de la licencia del cliente referido; un negocio cuenta como "cerrado" solo cuando la empresa ha pagado su licencia anual; los pagos de comisiones son mensuales.

Siguiente paso: completa el cuestionario en este enlace:
${data.questionnaireUrl}

En el cuestionario:
• Completa tu información profesional
• Acepta los términos y condiciones del programa
• Envía tu solicitud para revisión

Cuando lo envíes, revisaremos tu solicitud y te contactaremos. Si es aprobada, recibirás un correo con tus credenciales de acceso.

Si no solicitaste ser afiliado, puedes ignorar este mensaje.

Más información: ${siteUrl}/afiliados

El equipo de Humano SISU`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 28px;">Completa tu cuestionario de afiliación</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Programa de Afiliados 2026 · Humano SISU</p>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #333; margin-top: 0;">Gracias por tu interés</h2>
          
          <p style="color: #666; line-height: 1.6;">
            Este correo es el siguiente paso para unirte al <strong>programa de afiliados de Humano SISU</strong>:
            comisiones recurrentes por cada cliente que refieras, para llevar una solución de RRHH a más empresas en Honduras.
          </p>
          
          <p style="color: #666; line-height: 1.6;">
            Para continuar, completa el cuestionario haciendo clic en el botón:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.questionnaireUrl}" 
               style="background: #667eea; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px;">
              Completar cuestionario
            </a>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
            <h3 style="color: #333; margin-top: 0;">Estructura de comisiones 2026</h3>
            <ul style="color: #666; line-height: 1.8;">
              <li><strong>10%</strong> de comisión por tu primer negocio cerrado.</li>
              <li><strong>+1%</strong> de comisión adicional por cada nuevo negocio, hasta un tope del <strong>20%</strong>.</li>
              <li>El nivel de comisión que alcances se mantiene <strong>fijo durante todo el año 2026</strong>.</li>
            </ul>
          </div>

          <div style="background: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196F3;">
            <h3 style="color: #333; margin-top: 0;">Bono de rendimiento 2026</h3>
            <ul style="color: #666; line-height: 1.8;">
              <li><strong>+5%</strong> de comisiones adicionales durante todo el <strong>2026</strong>.</li>
              <li>Condición: cierra <strong>10 negocios</strong> antes del <strong>1 de febrero de 2026</strong>.</li>
            </ul>
          </div>

          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
            <h3 style="color: #333; margin-top: 0;">Reglas del programa</h3>
            <ul style="color: #666; line-height: 1.8;">
              <li>La comisión se paga sobre el <strong>valor anual de la licencia</strong> del cliente referido.</li>
              <li>Un negocio cuenta como &quot;cerrado&quot; solo cuando la empresa ha <strong>pagado su licencia anual</strong>.</li>
              <li>Los pagos de comisiones se realizan <strong>mensualmente</strong>.</li>
            </ul>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
            <h3 style="color: #333; margin-top: 0;">Qué debes hacer en el cuestionario</h3>
            <ul style="color: #666; line-height: 1.8;">
              <li>Completa el formulario con tu información profesional</li>
              <li>Acepta los términos y condiciones del programa de afiliados</li>
              <li>Envía tu solicitud para revisión</li>
            </ul>
          </div>
          
          <p style="color: #666; line-height: 1.6;">
            Cuando envíes el cuestionario, revisaremos tu solicitud y te contactaremos.
            Si tu solicitud es aprobada, recibirás un correo con tus credenciales de acceso.
          </p>
          
          <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <p style="margin: 0; color: #856404; font-size: 14px;">
              <strong>Importante:</strong> Si no solicitaste ser afiliado, puedes ignorar este correo.
            </p>
          </div>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            Página del programa: <a href="${siteUrl}/afiliados" style="color: #667eea;">${siteUrl}/afiliados</a><br>
            ¿Preguntas? Responde este correo.
          </p>
        </div>
        
        <div style="background: #333; padding: 20px; text-align: center; color: #999; font-size: 12px;">
          <p style="margin: 0;">© 2026 Humano SISU. Todos los derechos reservados.</p>
        </div>
      </div>
    `
  }

  return await emailService.sendEmail(config, content)
}








