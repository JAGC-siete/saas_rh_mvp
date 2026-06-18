import { Resend } from 'resend'
import { getResendFromContact } from '../resend-from'
import { appendUnsubscribeFooter } from './unsubscribe'
import type { SequenceStep } from './email-sequence-ledger'
import { buildWelcomeText, buildPainPoint1Text, buildPainPoint2Text, buildPainPoint3Text, buildPainPoint4Text, buildPainPoint5Text, SEQUENCE_CONTENT, SEQUENCE_STEP } from './email-sequence-ledger'

const resend = new Resend(process.env.RESEND_API_KEY)

export type SendSequenceEmailInput = {
  to: string
  step: SequenceStep
  unsubscribeToken: string
  /** Used for Step 0 Welcome greeting line and Steps 1–5 personalization. */
  source?: string
  /** Step 0 only: overrides source-based greeting (bulk manual send). */
  welcomeTextOverride?: string
  /** First name / display name for personalized pain-point openers. */
  recipientName?: string | null
  dryRun?: boolean
}

export async function sendSequenceEmail(input: SendSequenceEmailInput): Promise<void> {
  const content = SEQUENCE_CONTENT[input.step]
  if (!content) {
    throw new Error(`Unknown sequence step: ${input.step}`)
  }

  let bodyText = content.text
  if (input.step === SEQUENCE_STEP.WELCOME) {
    if (input.welcomeTextOverride) {
      bodyText = input.welcomeTextOverride
    } else if (input.source) {
      bodyText = buildWelcomeText(input.source)
    }
  } else if (input.step === SEQUENCE_STEP.PAIN_POINT_1) {
    bodyText = buildPainPoint1Text({
      nombre: input.recipientName,
      email: input.to,
      source: input.source,
    })
  } else if (input.step === SEQUENCE_STEP.PAIN_POINT_2) {
    bodyText = buildPainPoint2Text({
      nombre: input.recipientName,
      email: input.to,
      source: input.source,
    })
  } else if (input.step === SEQUENCE_STEP.PAIN_POINT_3) {
    bodyText = buildPainPoint3Text({
      nombre: input.recipientName,
      email: input.to,
      source: input.source,
    })
  } else if (input.step === SEQUENCE_STEP.PAIN_POINT_4) {
    bodyText = buildPainPoint4Text({
      nombre: input.recipientName,
      email: input.to,
      source: input.source,
    })
  } else if (input.step === SEQUENCE_STEP.PAIN_POINT_5) {
    bodyText = buildPainPoint5Text({
      nombre: input.recipientName,
      email: input.to,
      source: input.source,
    })
  }

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
