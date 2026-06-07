import { Resend } from 'resend'
import { getResendFromContact } from '../resend-from'
import { appendUnsubscribeFooter } from './unsubscribe'
import type { SequenceStep } from './email-sequence-ledger'
import { buildWelcomeText, SEQUENCE_CONTENT, SEQUENCE_STEP } from './email-sequence-ledger'

const resend = new Resend(process.env.RESEND_API_KEY)

export type SendSequenceEmailInput = {
  to: string
  step: SequenceStep
  unsubscribeToken: string
  /** Used only for Step 0 Welcome greeting line. */
  source?: string
  dryRun?: boolean
}

export async function sendSequenceEmail(input: SendSequenceEmailInput): Promise<void> {
  const content = SEQUENCE_CONTENT[input.step]
  if (!content) {
    throw new Error(`Unknown sequence step: ${input.step}`)
  }

  const bodyText =
    input.step === SEQUENCE_STEP.WELCOME && input.source
      ? buildWelcomeText(input.source)
      : content.text

  const text = appendUnsubscribeFooter(bodyText, input.unsubscribeToken)

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
