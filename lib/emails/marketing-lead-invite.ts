/**
 * One-time invite email for migrated marketing leads who never activated trial.
 * Uses lead_invite variant (no credentials; CTA → /activar).
 */

import { getResendFromContact } from '../resend-from'
import { buildUnsubscribeUrl } from '../marketing/unsubscribe'
import {
  buildSisuTrialAccessEmailHtml,
  getSisuTrialAccessEmailSubject,
} from './sisu-trial-access-html'

export type MarketingLeadInviteEmailData = {
  to: string
  /** Display name; falls back to local-part of email. */
  nombre?: string
  unsubscribeToken?: string
  activarUrl?: string
  dryRun?: boolean
}

function defaultNombreFromEmail(email: string): string {
  const local = email.split('@')[0]?.trim() || 'Equipo'
  const firstSegment = local.split(/[._-]/)[0] || local
  if (!firstSegment) return 'Equipo'
  return firstSegment.charAt(0).toUpperCase() + firstSegment.slice(1).toLowerCase()
}

export async function sendMarketingLeadInviteEmail(
  data: MarketingLeadInviteEmailData
): Promise<{ id?: string; skipped?: boolean }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('RESEND_API_KEY not configured')
  }

  if (data.dryRun || process.env.WATCHMAN_DRY_RUN === 'true') {
    return { skipped: true }
  }

  const nombre = data.nombre?.trim() || defaultNombreFromEmail(data.to)
  const unsubscribeUrl = data.unsubscribeToken
    ? buildUnsubscribeUrl(data.unsubscribeToken)
    : undefined

  const html = buildSisuTrialAccessEmailHtml({
    variant: 'lead_invite',
    nombre,
    activarUrl: data.activarUrl,
    unsubscribeUrl,
  })

  const subject = getSisuTrialAccessEmailSubject({ variant: 'lead_invite' })

  const { Resend } = await import('resend')
  const resend = new Resend(apiKey)

  const result = await resend.emails.send({
    from: getResendFromContact(),
    to: data.to,
    subject,
    html,
  })

  const id = (result as { data?: { id?: string } }).data?.id
  return { id }
}
