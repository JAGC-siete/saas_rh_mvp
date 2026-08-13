import { VENTAS_BRAND as B } from '../ventas/brand-styles'
import { MARKETING_UNSUBSCRIBE_FOOTER_TEXT, buildUnsubscribeUrl } from './unsubscribe'
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
  return local || 'Hola'
}

export function buildSuscripcionPackEmailHtml(params: {
  nombre?: string | null
  email: string
  unsubscribeToken: string
}): string {
  const greeting = escapeHtml(firstName(params.nombre, params.email))
  const unsubscribeUrl = escapeHtml(buildUnsubscribeUrl(params.unsubscribeToken))

  const bodyHtml = [
    liquidParagraph(`Hola ${greeting},`),
    liquidParagraph(
      escapeMultiline(
        'Acabás de hacer algo que casi nadie hace: revisar si lo que te descontaron cuadra con la ley — en lugar de confiar en "lo que siempre me han pagado".'
      )
    ),
    liquidParagraph(
      'Te dejo por escrito lo que viste en pantalla, por si querés guardarlo o compararlo con tu próximo recibo.'
    ),
    liquidPanel(
      liquidBulletList([
        'Recordatorios de fechas que importan (aguinaldo, catorceavo, etc.)',
        'Explicaciones claras cuando cambian deducciones',
        'Guías para entender tu recibo sin jerga de RRHH',
      ]),
      'Qué vas a recibir de acá en adelante'
    ),
    liquidParagraph('Un saludo,<br /><strong>Jorge</strong>'),
    liquidInfoBox(
      'Mañana te mando la primera nota — algo que veo una y otra vez cuando la gente compara su cálculo con el recibo real.',
      'neutral'
    ),
    `<p style="margin: 0; text-align: center; font-size: 12px; color: ${B.emailTextMuted}; line-height: 1.55;">
      ${MARKETING_UNSUBSCRIBE_FOOTER_TEXT}<br />
      <a href="${unsubscribeUrl}" style="color: ${B.emailAccent};">${unsubscribeUrl}</a>
    </p>`,
  ].join('')

  return wrapLiquidEmail({
    title: 'Humano SISU',
    subtitle: 'Tu cálculo, por escrito',
    badge: 'Recibo confirmado',
    bodyHtml,
  })
}
