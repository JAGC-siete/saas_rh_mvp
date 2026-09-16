/**
 * Correo de aviso al dueño del negocio cuando su landing captura un lead.
 * Usa el layout de correos del repo (lib/emails/liquid-layout).
 */

import {
  escapeHtml,
  liquidKeyValueTable,
  liquidParagraph,
  wrapLiquidEmail,
} from '../emails/liquid-layout'
import { formatDateTimeForHonduras } from '../timezone'
import { landingPublicUrl } from './paths'
import type { LandingLead } from './lead-schema'

export interface LandingLeadEmailContext {
  lead: LandingLead
  landingTitle: string
  slug: string
  receivedAt: Date
}

export function buildLandingLeadNotification(ctx: LandingLeadEmailContext): {
  subject: string
  html: string
  /** Responder al correo lleva directo al interesado cuando dejó uno. */
  replyTo?: string
} {
  const { lead, landingTitle, slug, receivedAt } = ctx
  const pageUrl = landingPublicUrl(slug)

  const bodyHtml = [
    liquidParagraph(
      `Alguien llenó el formulario de <strong>${escapeHtml(landingTitle)}</strong> (${escapeHtml(pageUrl)}).`
    ),
    liquidKeyValueTable([
      { label: 'Nombre', value: lead.fullName, emphasize: true },
      { label: 'Correo', value: lead.email || '—' },
      { label: 'Teléfono / WhatsApp', value: lead.phone || '—' },
      { label: 'Mensaje', value: lead.message || '—' },
      { label: 'Recibido (HN)', value: formatDateTimeForHonduras(receivedAt) },
    ]),
    liquidParagraph('Contesta pronto: quien llena un formulario suele estar comparando dos o tres opciones.'),
  ].join('')

  return {
    subject: `Nuevo lead de tu página — ${lead.fullName}`,
    html: wrapLiquidEmail({
      title: 'Nuevo lead de tu landing page',
      subtitle: landingTitle,
      badge: 'Lead',
      bodyHtml,
      footerNote: 'Aviso automático de tu página publicada. Los leads también quedan en tu panel.',
    }),
    replyTo: lead.email,
  }
}
