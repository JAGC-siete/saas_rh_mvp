import { Resend } from 'resend'
import { getResendFromContact } from '../resend-from'
import { appendUnsubscribeFooter } from './unsubscribe'
import type { SequenceStep } from './email-sequence-ledger'
import { SEQUENCE_CONTENT } from './email-sequence-ledger'

const resend = new Resend(process.env.RESEND_API_KEY)

export type SendSequenceEmailInput = {
  to: string
  step: SequenceStep
  unsubscribeToken: string
  dryRun?: boolean
}

export async function sendSequenceEmail(input: SendSequenceEmailInput): Promise<void> {
  const content = SEQUENCE_CONTENT[input.step]
  if (!content) {
    throw new Error(`Unknown sequence step: ${input.step}`)
  }

  const text = appendUnsubscribeFooter(content.text, input.unsubscribeToken)

  if (input.dryRun || process.env.WATCHMAN_DRY_RUN === 'true') {
    return
  }

  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY not configured')
  }

  await resend.emails.send({
    from: getResendFromContact(),
    to: input.to,
    subject: content.subject,
    text,
  })
}
