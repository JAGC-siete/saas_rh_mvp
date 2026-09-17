/**
 * Aviso interno cuando un comerciante envía una solicitud de inscripción al directorio.
 */

import {
  escapeHtml,
  liquidKeyValueTable,
  liquidParagraph,
  wrapLiquidEmail,
} from '../emails/liquid-layout'
import { formatDateTimeForHonduras } from '../timezone'
import { mercadoInscriptionCanonical } from './meta'
import { mercadoApplicationsAdminPath } from './paths'
import { mercadoAbsoluteUrl } from './public-url'
import type { MercadoInscription } from './inscription-schema'

/** Destino de operación del MVP. No es secreto; se puede sobreescribir por env. */
export const MERCADO_INSCRIPTION_NOTIFY_DEFAULT = 'jorge7gomez@gmail.com'

export function mercadoInscriptionNotifyEmail(): string {
  const dedicated = process.env.MERCADO_INSCRIPTION_NOTIFY_EMAIL?.trim()
  if (dedicated) return dedicated
  const shared = process.env.REGISTRO_NOTIFICATION_EMAIL?.trim()
  if (shared) return shared
  return MERCADO_INSCRIPTION_NOTIFY_DEFAULT
}

export function buildMercadoInscriptionNotification(params: {
  inscription: MercadoInscription
  receivedAt: Date
}): { subject: string; html: string } {
  const { inscription, receivedAt } = params
  const adminUrl = mercadoAbsoluteUrl(mercadoApplicationsAdminPath())

  const bodyHtml = [
    liquidParagraph(
      `Llegó una <strong>solicitud de inscripción</strong> al directorio del Mercado Municipal San Pablo (${escapeHtml(mercadoInscriptionCanonical())}).`
    ),
    liquidKeyValueTable([
      { label: 'Comercio', value: inscription.businessName, emphasize: true },
      { label: 'Comerciante', value: inscription.merchantName },
      { label: 'Número de local', value: inscription.stallNumber },
      { label: 'Estado', value: 'Recibida · pendiente de revisión' },
      { label: 'Recibido (HN)', value: formatDateTimeForHonduras(receivedAt) },
    ]),
    liquidParagraph(
      `No se creó ficha pública ni cuenta. El alta se hace a mano en ${escapeHtml(adminUrl)}.`
    ),
  ].join('')

  return {
    subject: `Solicitud de inscripción — ${inscription.businessName} (local ${inscription.stallNumber})`,
    html: wrapLiquidEmail({
      title: 'Solicitud de inscripción',
      subtitle: 'Mercado Municipal San Pablo',
      badge: 'Directorio',
      bodyHtml,
      footerNote: 'Aviso automático del formulario público. La solicitud queda pendiente de revisión.',
    }),
  }
}
