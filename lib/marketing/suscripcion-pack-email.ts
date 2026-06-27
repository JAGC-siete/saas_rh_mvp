import { Resend } from 'resend'
import { getResendFromContact } from '../resend-from'
import { buildSuscripcionPackEmailHtml } from './suscripcion-pack-email-html'
import { appendUnsubscribeFooter } from './unsubscribe'
import {
  SUSCRIPCION_PACK_SUBJECT,
  buildSuscripcionPackEmailBody,
} from './suscripcion-field-notes-email'

export const SUSCRIPCION_PACK_LEDGER_LABEL = 'Suscripcion Pack'

export { SUSCRIPCION_SEQUENCE_WELCOME_DELAY_HOURS } from './suscripcion-sequence-timing'

export function buildSuscripcionPackSubject(): string {
  return SUSCRIPCION_PACK_SUBJECT
}

export function buildSuscripcionPackEmailText(params: {
  nombre?: string | null
  email: string
  unsubscribeToken: string
}): string {
  const body = buildSuscripcionPackEmailBody({ nombre: params.nombre, email: params.email })
  return appendUnsubscribeFooter(body, params.unsubscribeToken)
}

export type SendSuscripcionPackEmailInput = {
  to: string
  nombre?: string | null
  unsubscribeToken: string
  dryRun?: boolean
}

export async function sendSuscripcionPackEmail(input: SendSuscripcionPackEmailInput): Promise<void> {
  if (input.dryRun || process.env.WATCHMAN_DRY_RUN === 'true') {
    return
  }

  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY not configured')
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const subject = buildSuscripcionPackSubject(input.nombre, input.to)
  const text = buildSuscripcionPackEmailText({
    nombre: input.nombre,
    email: input.to,
    unsubscribeToken: input.unsubscribeToken,
  })
  const html = buildSuscripcionPackEmailHtml({
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
