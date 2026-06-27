import { Resend } from 'resend'
import { getResendFromContact } from '../resend-from'
import { appendUnsubscribeFooter } from './unsubscribe'
import type { SequenceStep } from './email-sequence-ledger'
import {
  buildWelcomeText,
  buildPainPoint1Text,
  buildPainPoint2Text,
  buildPainPoint3Text,
  buildPainPoint4Text,
  buildPainPoint5Text,
  SEQUENCE_CONTENT,
  SEQUENCE_STEP,
} from './email-sequence-ledger'
import { sequenceStepToMissionId } from './mission-config'
import { normalizeLeadSource } from './email-sequence-ledger'
import { getInfoSequenceSubject } from './info-field-notes-email'
import { getSuscripcionSequenceSubject } from './suscripcion-field-notes-email'
import { buildSequenceEmailHtml, buildWelcomeEmailHtml } from './sequence-email-html'

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

function buildBodyText(input: SendSequenceEmailInput): string {
  const tokenParams = {
    nombre: input.recipientName,
    email: input.to,
    source: input.source,
    leadToken: input.unsubscribeToken,
  }

  if (input.step === SEQUENCE_STEP.WELCOME) {
    if (input.welcomeTextOverride) return input.welcomeTextOverride
    if (input.source) return buildWelcomeText(input.source)
    return SEQUENCE_CONTENT[input.step].text
  }

  if (input.step === SEQUENCE_STEP.PAIN_POINT_1) return buildPainPoint1Text(tokenParams)
  if (input.step === SEQUENCE_STEP.PAIN_POINT_2) return buildPainPoint2Text(tokenParams)
  if (input.step === SEQUENCE_STEP.PAIN_POINT_3) return buildPainPoint3Text(tokenParams)
  if (input.step === SEQUENCE_STEP.PAIN_POINT_4) return buildPainPoint4Text(tokenParams)
  if (input.step === SEQUENCE_STEP.PAIN_POINT_5) return buildPainPoint5Text(tokenParams)

  throw new Error(`Unknown sequence step: ${String(input.step)}`)
}

export async function sendSequenceEmail(input: SendSequenceEmailInput): Promise<void> {
  const content = SEQUENCE_CONTENT[input.step]
  if (!content) {
    throw new Error(`Unknown sequence step: ${input.step}`)
  }

  const bodyText = buildBodyText(input)
  const text = appendUnsubscribeFooter(bodyText, input.unsubscribeToken)

  const missionId = sequenceStepToMissionId(input.step)
  const leadKind = normalizeLeadSource(input.source)
  const subject =
    leadKind === 'info'
      ? getInfoSequenceSubject(input.step)
      : leadKind === 'suscripcion'
        ? getSuscripcionSequenceSubject(input.step)
        : content.subject
  const html =
    input.step === SEQUENCE_STEP.WELCOME
      ? buildWelcomeEmailHtml({
          subject,
          bodyText: bodyText.replace(/\n\n— Jorge[\s\S]*?(?=\n\n---|$)/, '').trim(),
          unsubscribeToken: input.unsubscribeToken,
          showMissionTeaser: false,
          source: input.source,
        })
      : missionId
        ? buildSequenceEmailHtml({
            subject,
            bodyText,
            unsubscribeToken: input.unsubscribeToken,
            missionId,
            leadToken: input.unsubscribeToken,
            source: input.source,
          })
        : undefined

  if (input.dryRun || process.env.WATCHMAN_DRY_RUN === 'true') {
    return
  }

  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY not configured')
  }

  await resend.emails.send({
    from: getResendFromContact(),
    to: input.to,
    subject,
    text,
    ...(html ? { html } : {}),
  })
}
