import { emailService } from '../email-service'
import { notificationManager } from '../notification-providers'
import {
  liquidBulletList,
  liquidCta,
  liquidInfoBox,
  liquidParagraph,
  liquidPanel,
  wrapLiquidEmail,
} from './liquid-layout'
import { LIQUID } from '../brand/liquid-tokens'

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

  const bodyHtml = [
    liquidParagraph(
      'Gracias por tu interés en el <strong>programa de afiliados de Humano SISU</strong>: comisiones recurrentes por cada cliente que refieras, para llevar una solución de RRHH a más empresas en El Salvador, Guatemala y Honduras.'
    ),
    liquidParagraph('Para continuar, completa el cuestionario haciendo clic en el botón:'),
    liquidCta(data.questionnaireUrl, 'Completar cuestionario'),
    liquidPanel(
      liquidBulletList([
        '<strong>10%</strong> de comisión por tu primer negocio cerrado.',
        '<strong>+1%</strong> de comisión adicional por cada nuevo negocio, hasta un tope del <strong>20%</strong>.',
        'El nivel de comisión que alcances se mantiene <strong>fijo durante todo el año 2026</strong>.',
      ]),
      'Estructura de comisiones 2026'
    ),
    liquidPanel(
      liquidBulletList([
        '<strong>+5%</strong> de comisiones adicionales durante todo el <strong>2026</strong>.',
        'Condición: cierra <strong>10 negocios</strong> antes del <strong>1 de febrero de 2026</strong>.',
      ]),
      'Bono de rendimiento 2026'
    ),
    liquidPanel(
      liquidBulletList([
        'La comisión se paga sobre el <strong>valor anual de la licencia</strong> del cliente referido.',
        'Un negocio cuenta como &quot;cerrado&quot; solo cuando la empresa ha <strong>pagado su licencia anual</strong>.',
        'Los pagos de comisiones se realizan <strong>mensualmente</strong>.',
      ]),
      'Reglas del programa'
    ),
    liquidPanel(
      liquidBulletList([
        'Completa el formulario con tu información profesional',
        'Acepta los términos y condiciones del programa de afiliados',
        'Envía tu solicitud para revisión',
      ]),
      'Qué debes hacer en el cuestionario'
    ),
    liquidParagraph(
      'Cuando envíes el cuestionario, revisaremos tu solicitud y te contactaremos. Si tu solicitud es aprobada, recibirás un correo con tus credenciales de acceso.'
    ),
    liquidInfoBox(
      '<strong>Importante:</strong> Si no solicitaste ser afiliado, puedes ignorar este correo.',
      'warning'
    ),
    liquidParagraph(
      `Página del programa: <a href="${siteUrl}/afiliados" style="color: ${LIQUID.textAccent};">${siteUrl}/afiliados</a><br>¿Preguntas? Responde este correo.`
    ),
  ].join('')

  const html = wrapLiquidEmail({
    title: 'Completa tu cuestionario de afiliación',
    subtitle: 'Programa de Afiliados 2026',
    badge: 'Afiliados',
    bodyHtml,
  })

  const content = {
    to: data.to,
    subject: 'Completa tu cuestionario de afiliación (programa 2026) - Humano SISU',
    text: `¡Hola!

Gracias por tu interés en el programa de afiliados de Humano SISU: comisiones recurrentes por cada cliente que refieras, ayudando a llevar una solución de RRHH a más empresas en la región (El Salvador, Guatemala y Honduras).

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
    html,
  }

  return await emailService.sendEmail(config, content)
}








