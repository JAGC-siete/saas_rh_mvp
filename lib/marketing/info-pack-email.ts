import { Resend } from 'resend'
import { getResendFromContact } from '../resend-from'
import { buildInfoPackEmailHtml } from './info-pack-email-html'
import { appendUnsubscribeFooter } from './unsubscribe'
import {
  INFO_PACK_SUBJECT_FIELD,
  buildInfoPackEmailBody,
} from './info-field-notes-email'

/** @deprecated Use INFO_PACK_SUBJECT_FIELD */
export const INFO_PACK_SUBJECT = INFO_PACK_SUBJECT_FIELD

/** Ledger label for the immediate /info pack (distinct from sequence Welcome at +24h). */
export const INFO_PACK_LEDGER_LABEL = 'Info Pack'

/** @deprecated Use INFO_PACK_SUBJECT_FIELD */
export const INFO_PACK_SUBJECT_PREFIX = INFO_PACK_SUBJECT_FIELD

export { INFO_SEQUENCE_WELCOME_DELAY_HOURS } from './info-sequence-timing'

export function buildInfoPackSubject(): string {
  return INFO_PACK_SUBJECT_FIELD
}

export function buildInfoPackEmailText(params: {
  nombre?: string | null
  email: string
  unsubscribeToken: string
}): string {
  const body = buildInfoPackEmailBody({ nombre: params.nombre, email: params.email })
  return appendUnsubscribeFooter(body, params.unsubscribeToken)
}

export type SendInfoPackEmailInput = {
  to: string
  nombre?: string | null
  unsubscribeToken: string
  dryRun?: boolean
}

export async function sendInfoPackEmail(input: SendInfoPackEmailInput): Promise<void> {
  if (input.dryRun || process.env.WATCHMAN_DRY_RUN === 'true') {
    return
  }

  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY not configured')
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const subject = buildInfoPackSubject(input.nombre, input.to)
  const text = buildInfoPackEmailText({
    nombre: input.nombre,
    email: input.to,
    unsubscribeToken: input.unsubscribeToken,
  })
  const html = buildInfoPackEmailHtml({
    nombre: input.nombre,
    email: input.to,
    unsubscribeToken: input.unsubscribeToken,
  })

  await resend.emails.send({
    from: getResendFromContact(),
    to: input.to,
    subject,
    html,
    text,
  })
}
