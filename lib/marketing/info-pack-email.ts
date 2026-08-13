import { Resend } from 'resend'
import { getResendFromContact } from '../resend-from'
import { buildInfoPackEmailHtml } from './info-pack-email-html'
import { appendUnsubscribeFooter } from './unsubscribe'
import {
  INFO_PACK_SUBJECT_FIELD,
  INFO_PACK_SUBJECT_VIERNES,
  buildInfoPackEmailBody,
  type InfoPackVariant,
} from './info-field-notes-email'

/** @deprecated Use INFO_PACK_SUBJECT_FIELD */
export const INFO_PACK_SUBJECT = INFO_PACK_SUBJECT_FIELD

/** Ledger label for the immediate /info pack (distinct from sequence Welcome at +24h). */
export const INFO_PACK_LEDGER_LABEL = 'Info Pack'

/** @deprecated Use INFO_PACK_SUBJECT_FIELD */
export const INFO_PACK_SUBJECT_PREFIX = INFO_PACK_SUBJECT_FIELD

export { INFO_SEQUENCE_WELCOME_DELAY_HOURS } from './info-sequence-timing'

export function buildInfoPackSubject(variant: InfoPackVariant = 'default'): string {
  return variant === 'viernes' ? INFO_PACK_SUBJECT_VIERNES : INFO_PACK_SUBJECT_FIELD
}

export function buildInfoPackEmailText(params: {
  nombre?: string | null
  email: string
  unsubscribeToken: string
  variant?: InfoPackVariant
}): string {
  const body = buildInfoPackEmailBody({
    nombre: params.nombre,
    email: params.email,
    variant: params.variant,
  })
  return appendUnsubscribeFooter(body, params.unsubscribeToken)
}

export type SendInfoPackEmailInput = {
  to: string
  nombre?: string | null
  unsubscribeToken: string
  /** /viernes uses same Paper Bridge pack with “recuperar el viernes” opener. */
  variant?: InfoPackVariant
  dryRun?: boolean
}

export async function sendInfoPackEmail(input: SendInfoPackEmailInput): Promise<void> {
  if (input.dryRun || process.env.WATCHMAN_DRY_RUN === 'true') {
    return
  }

  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY not configured')
  }

  const variant = input.variant ?? 'default'
  const resend = new Resend(process.env.RESEND_API_KEY)
  const subject = buildInfoPackSubject(variant)
  const text = buildInfoPackEmailText({
    nombre: input.nombre,
    email: input.to,
    unsubscribeToken: input.unsubscribeToken,
    variant,
  })
  const html = buildInfoPackEmailHtml({
    nombre: input.nombre,
    email: input.to,
    unsubscribeToken: input.unsubscribeToken,
    variant,
  })

  await resend.emails.send({
    from: getResendFromContact(),
    to: input.to,
    subject,
    html,
    text,
  })
}
