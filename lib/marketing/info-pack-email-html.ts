import { VENTAS_BRAND as B } from '../ventas/brand-styles'
import { MARKETING_UNSUBSCRIBE_FOOTER_TEXT, buildUnsubscribeUrl, getMarketingSiteUrl } from './unsubscribe'
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
}): string {
  const greeting = escapeHtml(firstName(params.nombre, params.email))
  const site = getMarketingSiteUrl().replace(/\/$/, '')
  const activarUrl = `${site}/activar`
  const ventasUrl = `${site}/ventas`
  const unsubscribeUrl = escapeHtml(buildUnsubscribeUrl(params.unsubscribeToken))

  const bodyHtml = [
    liquidParagraph(`Hola ${greeting},`),
    liquidParagraph(
      escapeMultiline(
        'Acabas de hacer algo que casi nadie hace: leer el extracto completo antes de seguir adelante.'
      )
    ),
    liquidParagraph(
      'Si viste la pantalla, ya tienes la idea central: mucha gente cree que "digitalizó" porque puso un reloj en la entrada… y a fin de quincena sigue bajando archivos, abriendo Excel y persiguiendo datos por WhatsApp. Eso no es automatizar. Es <strong>reprocesar</strong> con pantalla en vez de papel.'
    ),
    liquidParagraph('Te dejo por escrito lo mismo — por si quieres guardarlo.'),
    liquidPanel(
      liquidBulletList([
        'Capturan el dato en un lugar.',
        'Lo mueven a mano a otro.',
        'Lo vuelven a calcular en otro más.',
        'Y alguien — casi siempre el dueño o una persona de confianza — termina siendo el "puente" entre sistemas que no se hablan.',
      ]),
      'Lo que veo una y otra vez en negocios de la región'
    ),
    liquidParagraph(
      'Eso cansa. Y casi nadie lo mide porque "así siempre lo hemos hecho".'
    ),
    liquidParagraph(
      'Si más adelante te da curiosidad ver cómo se ve cuando el dato viaja solo (sin USB, sin doble digitación), aquí están dos enlaces — úsalos solo si te apetece:'
    ),
    `<div style="text-align: center; margin: 18px 0;">
      <a href="${activarUrl}" style="display: inline-block; background: linear-gradient(135deg, ${B.emailAccent}, #2563eb); color: white; padding: 12px 22px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; margin: 0 6px 10px 6px;">Ver el motor en 30 segundos</a>
      <a href="${ventasUrl}" style="display: inline-block; background: transparent; color: ${B.emailAccent}; padding: 11px 22px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; border: 2px solid ${B.emailAccent}; margin: 0 6px 10px 6px;">Tablas de precios (sin llamadas)</a>
    </div>`,
    liquidParagraph('Un saludo,<br /><strong>Jorge</strong>'),
    liquidInfoBox(
      'En los próximos días te mando unas notas cortas — una por email — sobre las trampas invisibles que veo en casi todos los negocios. La primera llega mañana. Solo leer si te interesa.',
      'neutral'
    ),
    `<p style="margin: 0; text-align: center; font-size: 12px; color: ${B.emailTextMuted}; line-height: 1.55;">
      ${MARKETING_UNSUBSCRIBE_FOOTER_TEXT}<br />
      <a href="${unsubscribeUrl}" style="color: ${B.emailAccent};">${unsubscribeUrl}</a>
    </p>`,
  ].join('')

  return wrapLiquidEmail({
    title: 'Humano SISU',
    subtitle: 'Lo que viste en pantalla, por escrito',
    badge: 'Nota de campo',
    bodyHtml,
    footerNote: `Humano SISU · ${site}`,
  })
}
