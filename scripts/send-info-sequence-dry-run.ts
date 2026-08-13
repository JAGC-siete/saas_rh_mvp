/**
 * Dry-run: send the full /info (/secreto) email sequence to a test inbox.
 * Usage: npx tsx scripts/send-info-sequence-dry-run.ts
 *    or: railway run npx tsx scripts/send-info-sequence-dry-run.ts
 */

import { Resend } from 'resend'
import { getResendFromContact } from '../lib/resend-from'
import {
  buildInfoPackEmailText,
  buildInfoPackSubject,
} from '../lib/marketing/info-pack-email'
import { buildInfoPackEmailHtml } from '../lib/marketing/info-pack-email-html'
import {
  buildInfoWelcomeText,
  getInfoSequenceSubject,
} from '../lib/marketing/info-field-notes-email'
import {
  buildPainPoint1Text,
  buildPainPoint2Text,
  buildPainPoint3Text,
  buildPainPoint4Text,
  buildPainPoint5Text,
  SEQUENCE_STEP,
} from '../lib/marketing/email-sequence-ledger'
import { appendUnsubscribeFooter } from '../lib/marketing/unsubscribe'
import { buildSequenceEmailHtml, buildWelcomeEmailHtml } from '../lib/marketing/sequence-email-html'
import { stripTrailingSignOff } from '../lib/marketing/mission-config'

const TEST_EMAIL = 'jorge7gomez@gmail.com'
const TEST_NAME = 'Jorge'
const TEST_TOKEN = 'dry-run-info-sequence'
const SOURCE = 'info'
const DRY_RUN_PREFIX = '[DRY RUN]'

type OutboundEmail = {
  label: string
  subject: string
  text: string
  html?: string
}

function buildInfoSequenceEmails(): OutboundEmail[] {
  const tokenParams = {
    nombre: TEST_NAME,
    email: TEST_EMAIL,
    source: SOURCE,
    leadToken: TEST_TOKEN,
  }

  const infoPackText = buildInfoPackEmailText({
    nombre: TEST_NAME,
    email: TEST_EMAIL,
    unsubscribeToken: TEST_TOKEN,
  })
  const infoPackHtml = buildInfoPackEmailHtml({
    nombre: TEST_NAME,
    email: TEST_EMAIL,
    unsubscribeToken: TEST_TOKEN,
  })

  const welcomeText = appendUnsubscribeFooter(buildInfoWelcomeText(), TEST_TOKEN)
  const welcomeSubject = getInfoSequenceSubject(SEQUENCE_STEP.WELCOME)
  const welcomeBody = buildInfoWelcomeText()

  const painPoints = [
    {
      label: 'PP1',
      step: SEQUENCE_STEP.PAIN_POINT_1,
      text: buildPainPoint1Text(tokenParams),
    },
    {
      label: 'PP2',
      step: SEQUENCE_STEP.PAIN_POINT_2,
      text: buildPainPoint2Text(tokenParams),
    },
    {
      label: 'PP3',
      step: SEQUENCE_STEP.PAIN_POINT_3,
      text: buildPainPoint3Text(tokenParams),
    },
    {
      label: 'PP4',
      step: SEQUENCE_STEP.PAIN_POINT_4,
      text: buildPainPoint4Text(tokenParams),
    },
    {
      label: 'PP5',
      step: SEQUENCE_STEP.PAIN_POINT_5,
      text: buildPainPoint5Text(tokenParams),
    },
  ] as const

  return [
    {
      label: 'Info Pack (inmediato)',
      subject: buildInfoPackSubject(),
      text: infoPackText,
      html: infoPackHtml,
    },
    {
      label: 'Clave #0 Welcome (+24h)',
      subject: welcomeSubject,
      text: welcomeText,
      html: buildWelcomeEmailHtml({
        subject: welcomeSubject,
        bodyText: stripTrailingSignOff(welcomeBody),
        unsubscribeToken: TEST_TOKEN,
        showMissionTeaser: false,
        source: SOURCE,
      }),
    },
    ...painPoints.map(({ label, step, text }) => {
      const subject = getInfoSequenceSubject(step)
      const fullText = appendUnsubscribeFooter(text, TEST_TOKEN)
      return {
        label,
        subject,
        text: fullText,
        html: buildSequenceEmailHtml({
          subject,
          bodyText: text,
          unsubscribeToken: TEST_TOKEN,
          missionId: step,
          leadToken: TEST_TOKEN,
          source: SOURCE,
        }),
      }
    }),
  ]
}

async function main() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error('RESEND_API_KEY is required')
    process.exit(1)
  }

  const resend = new Resend(apiKey)
  const from = getResendFromContact()
  const emails = buildInfoSequenceEmails()

  console.log(`Sending ${emails.length} /info sequence emails to ${TEST_EMAIL}\n`)

  for (let i = 0; i < emails.length; i += 1) {
    const email = emails[i]
    const subject = `${DRY_RUN_PREFIX} ${i + 1}/${emails.length} · ${email.subject}`

    console.log(`→ ${email.label}`)
    console.log(`  subject: ${subject}`)

    const result = await resend.emails.send({
      from,
      to: TEST_EMAIL,
      subject,
      text: email.text,
      ...(email.html ? { html: email.html } : {}),
    })

    if ((result as { error?: { message?: string } })?.error) {
      throw new Error(
        (result as { error?: { message?: string } }).error?.message || `send failed: ${email.label}`
      )
    }

    console.log(`  ✅ id=${(result as { id?: string }).id || 'ok'}\n`)
  }

  console.log(`Done — ${emails.length} emails sent to ${TEST_EMAIL}`)
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err)
  console.error('Failed:', message)
  process.exit(1)
})
