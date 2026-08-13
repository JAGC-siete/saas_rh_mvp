import { VENTAS_BRAND as B } from '../ventas/brand-styles'
import { MARKETING_UNSUBSCRIBE_FOOTER_TEXT, buildUnsubscribeUrl, getMarketingSiteUrl } from './unsubscribe'
import type { InfoPackVariant } from './info-field-notes-email'
import {
  liquidBulletList,
  liquidInfoBox,
  liquidParagraph,
  liquidPanel,
  wrapLiquidEmail,
  escapeHtml,
  escapeMultiline,
} from '../emails/liquid-layout'

function firstName(raw?: string | null, email?: string): string {
  const name = typeof raw === 'string' ? raw.trim() : ''
  if (name) return name.split(/\s+/)[0] || name
  const local = (email ?? '').split('@')[0]?.trim()
  return local || 'Equipo'
}

export function buildInfoPackEmailHtml(params: {
  nombre?: string | null
  email: string
  unsubscribeToken: string
  variant?: InfoPackVariant
}): string {
  const greeting = escapeHtml(firstName(params.nombre, params.email))
  const site = getMarketingSiteUrl().replace(/\/$/, '')
  const activarUrl = `${site}/activar`
  const ventasUrl = `${site}/ventas`
  const unsubscribeUrl = escapeHtml(buildUnsubscribeUrl(params.unsubscribeToken))
  const variant = params.variant ?? 'default'
  const isViernes = variant === 'viernes'

  const bodyHtml = [
    liquidParagraph(`Hola ${greeting},`),
    liquidParagraph(
      escapeMultiline(
        isViernes
          ? 'Pediste recuperar el viernes. Eso empieza por mirar de frente el cierre que te lo está robando.'
          : 'Acabas de hacer algo que el 99% de los líderes evita: mirar de frente el departamento que más canas verdes saca en la empresa.'
      )
    ),
    liquidParagraph(
      isViernes
        ? 'La mayoría cree que RR.HH. es ineficiente por naturaleza: persiguiendo papeles, calculando mal la nómina, tardando días en un permiso. El domingo se va en Excel. Otra vez.'
        : 'Si viste la pantalla, ya entiendes el problema real. La mayoría de los directores cree que su equipo de RR.HH. es ineficiente por naturaleza. Piensan: "Es que se la pasan persiguiendo papeles, calculando mal las nóminas y tardando días en responder un permiso".'
    ),
    liquidParagraph(
      isViernes
        ? 'Pero recuperar el viernes no es cambiar de personal. Es <strong>destruir el puente de papel</strong> — digitalizar de verdad y automatizar el dato.'
        : 'Pero el secreto no es cambiar de personal. El secreto es <strong>destruir el puente de papel</strong>.'
    ),
    liquidPanel(
      liquidBulletList([
        'RR.HH. captura una incidencia en un reloj checador.',
        'Alguien la copia a mano en un Excel.',
        'El gerente de operaciones aprueba las horas por WhatsApp.',
        'Y tú (o tu contador) terminas jugando al detective para cuadrar la quincena.',
      ]),
      'El error fatal que cometen casi todos'
    ),
    liquidParagraph(
      'Eso no es culpa de Recursos Humanos. Eso es someter a humanos a hacer el trabajo de un software. El costo real es el resentimiento interno, los errores de cálculo y las horas perdidas.'
    ),
    liquidParagraph(
      isViernes
        ? 'Te dejo esto por escrito para el próximo cierre — cuando el viernes (o el domingo) te vuelva a quitar la calma.'
        : 'Te dejo esto por escrito para el próximo fin de mes, cuando la nómina te vuelva a quitar la calma.'
    ),
    liquidParagraph(
      'Si tienes curiosidad de ver cómo RR.HH. se vuelve tu aliado estratégico cuando el dato viaja solo, te dejo estos dos enlaces:'
    ),
    `<div style="text-align: center; margin: 18px 0;">
      <a href="${activarUrl}" style="display: inline-block; background: linear-gradient(135deg, ${B.emailAccent}, #2563eb); color: white; padding: 12px 22px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; margin: 0 6px 10px 6px;">Automatizar el dolor en 30 segundos</a>
      <a href="${ventasUrl}" style="display: inline-block; background: transparent; color: ${B.emailAccent}; padding: 11px 22px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; border: 2px solid ${B.emailAccent}; margin: 0 6px 10px 6px;">Los precios (sin llamadas molestas)</a>
    </div>`,
    liquidParagraph('Abrazo,<br /><strong>Jorge</strong>'),
    liquidInfoBox(
      isViernes
        ? 'Mañana empieza la serie de claves para digitalizar y automatizar — la forma real de recuperar el viernes. La Clave #1 desarma "siempre lo hemos hecho así".'
        : 'Mañana te enviaré la Clave #1 sobre la mentira corporativa más peligrosa del mundo. Si quieres dejar de perder dinero en fricción interna, te sugiero leerla.',
      'neutral'
    ),
    `<p style="margin: 0; text-align: center; font-size: 12px; color: ${B.emailTextMuted}; line-height: 1.55;">
      ${MARKETING_UNSUBSCRIBE_FOOTER_TEXT}<br />
      <a href="${unsubscribeUrl}" style="color: ${B.emailAccent};">${unsubscribeUrl}</a>
    </p>`,
  ].join('')

  return wrapLiquidEmail({
    title: 'Humano SISU',
    subtitle: isViernes
      ? 'Recuperar el viernes · paces con RR.HH.'
      : 'El documento para hacer las paces con RR.HH.',
    badge: isViernes ? 'Recuperar el viernes' : 'El secreto',
    bodyHtml,
    footerNote: `Humano SISU · ${site}`,
  })
}
