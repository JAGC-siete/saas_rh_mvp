import { VENTAS_BRAND as B } from '../ventas/brand-styles'
import { MARKETING_UNSUBSCRIBE_FOOTER_TEXT, buildUnsubscribeUrl, getMarketingSiteUrl } from './unsubscribe'
import {
  liquidBulletList,
  liquidInfoBox,
  liquidParagraph,
  liquidPanel,
  wrapLiquidEmail,
  escapeHtml,
} from '../emails/liquid-layout'

function displayName(raw?: string | null, email?: string): string {
  const name = typeof raw === 'string' ? raw.trim() : ''
  if (name) return name
  const local = (email ?? '').split('@')[0]?.trim()
  return local || 'Equipo'
}

function firstName(raw?: string | null, email?: string): string {
  const full = displayName(raw, email)
  return full.split(/\s+/)[0] || full
}

export function buildInfoPackEmailHtml(params: {
  nombre?: string | null
  email: string
  unsubscribeToken: string
}): string {
  const greeting = escapeHtml(firstName(params.nombre, params.email))
  const site = getMarketingSiteUrl().replace(/\/$/, '')
  const activarUrl = `${site}/activar`
  const ventasUrl = `${site}/ventas`
  const unsubscribeUrl = escapeHtml(buildUnsubscribeUrl(params.unsubscribeToken))

  const bodyHtml = [
    liquidParagraph(`Hola ${greeting},`),
    liquidParagraph(
      'El "truco" es más simple de lo que parece: <strong>Digitaliza el registro de asistencia a la oficina.</strong>'
    ),
    liquidParagraph(
      'Para que el trabajo más aburrido se haga solo, usamos el <strong>reloj biométrico SISU</strong>. En lugar de que una persona anote las horas a mano a fin de mes, el reloj registra, almacena, opera y presenta el trabajo pesado por ti.'
    ),
    liquidPanel(
      liquidBulletList([
        '<strong>Asistencia en tiempo real:</strong> Se conecta por internet a un reloj inteligente. Puedes ver desde tu celular o computadora quién llegó y a qué hora, sin tener que revisar libretas ni hojas de firmas.',
        '<strong>Los pagos se calculan solos:</strong> Te olvidas de hacer las sumas a mano. El sistema ya sabe cómo calcular todo (incluyendo IHSS, RAP o ISR según las reglas de tu país).',
        '<strong>Cero registros perdidos:</strong> Los permisos, vacaciones y datos importantes de tu equipo quedan guardados en un solo lugar seguro, y no perdidos en un chat de WhatsApp.',
      ]),
      'En pocas palabras, así es como te quitas el peso de encima'
    ),
    liquidPanel(
      liquidParagraph(
        'Está pensado para dueños, encargados o contadores de equipos de <strong>5 a 200 personas</strong> (en Honduras, El Salvador o Guatemala) que quieren tener todo el control de su gente en una sola pantalla, y que quieren empezar rápido (<strong>se configura en días, no en meses</strong>).'
      ),
      '¿Para quién funciona mejor este truco?'
    ),
    liquidPanel(
      `${liquidParagraph('Como te prometí: <strong>cero venta</strong>. No tienes que decidir nada hoy ni hablar con ningún vendedor si no quieres.')}
      ${liquidParagraph('Pero si te da curiosidad ver si funcionaría en tu empresa o cómo se vería en tu empresa, aquí te dejo los enlaces directos:')}`,
      '¿Qué sigue ahora?'
    ),
    `<div style="text-align: center; margin: 18px 0;">
      <a href="${activarUrl}" style="display: inline-block; background: linear-gradient(135deg, ${B.emailAccent}, #2563eb); color: white; padding: 12px 22px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; margin: 0 6px 10px 6px;">Quiero ver cómo funciona</a>
      <a href="${ventasUrl}" style="display: inline-block; background: transparent; color: ${B.emailAccent}; padding: 11px 22px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; border: 2px solid ${B.emailAccent}; margin: 0 6px 10px 6px;">Ver precios sin compromiso</a>
    </div>`,
    liquidParagraph('Un saludo,<br /><strong>Equipo Humano SISU</strong>'),
    liquidInfoBox(
      'En los próximos días te voy a mandar <strong>5 correos breves</strong>. Te voy a contar sobre algunos errores súper comunes (y que cuestan dinero) que casi todo el mundo comete al organizar a su personal. ¡Nos leemos pronto!',
      'neutral'
    ),
    `<p style="margin: 0; text-align: center; font-size: 12px; color: ${B.emailTextMuted}; line-height: 1.55;">
      ${MARKETING_UNSUBSCRIBE_FOOTER_TEXT}<br />
      <a href="${unsubscribeUrl}" style="color: ${B.emailAccent};">${unsubscribeUrl}</a>
    </p>`,
  ].join('')

  return wrapLiquidEmail({
    title: 'Humano SISU',
    subtitle: 'El truco para que el trabajo aburrido se haga solo',
    badge: 'Lo prometido',
    bodyHtml,
    footerNote: `Humano SISU · ${site}`,
  })
}
