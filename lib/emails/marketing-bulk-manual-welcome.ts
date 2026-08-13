/**
 * Step 0 Welcome for the one-time manual bulk send (HTML invite + this text mail).
 * Opener: "Hola {nombre}, me dejaste en el olvido." — not used in live enroll flows.
 */

import { buildBulkManualWelcomeText, SEQUENCE_CONTENT, SEQUENCE_STEP } from '../marketing/email-sequence-ledger'
import { sendSequenceEmail } from '../marketing/send-sequence-email'

export type BulkManualWelcomeEmailData = {
  to: string
  nombre?: string
  unsubscribeToken: string
  dryRun?: boolean
}

function defaultNombreFromEmail(email: string): string {
  const local = email.split('@')[0]?.trim() || 'Equipo'
  const firstSegment = local.split(/[._-]/)[0] || local
  if (!firstSegment) return 'Equipo'
  return firstSegment.charAt(0).toUpperCase() + firstSegment.slice(1).toLowerCase()
}

export async function sendBulkManualWelcomeEmail(
  data: BulkManualWelcomeEmailData
): Promise<{ skipped?: boolean }> {
  const nombre = data.nombre?.trim() || defaultNombreFromEmail(data.to)
  const welcomeText = buildBulkManualWelcomeText(nombre)
  const subject = SEQUENCE_CONTENT[SEQUENCE_STEP.WELCOME].subject

  await sendSequenceEmail({
    to: data.to,
    step: SEQUENCE_STEP.WELCOME,
    unsubscribeToken: data.unsubscribeToken,
    welcomeTextOverride: welcomeText,
    dryRun: data.dryRun,
  })

  if (data.dryRun || process.env.WATCHMAN_DRY_RUN === 'true') {
    return { skipped: true }
  }

  return {}
}

export { buildBulkManualWelcomeText }
