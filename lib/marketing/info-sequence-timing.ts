/** Hours after info pack before Step 0 (Welcome). */
export const INFO_SEQUENCE_WELCOME_DELAY_HOURS = 24

/** Fixed cadence between Welcome → PP1 and PP1 → PP5 for /info leads. */
export const INFO_SEQUENCE_PP_DELAY_HOURS = 48

/** PP1 step index (matches SEQUENCE_STEP.PAIN_POINT_1). */
const PAIN_POINT_1_STEP = 1

export const INFO_WELCOME_MISSION_TEASER =
  'Mañana se activa la Misión 1 en tu bandeja de entrada: calcularemos el costo real del papeleo repetitivo. Estate atento.'

export function isInfoAcceleratedLead(source?: string | null): boolean {
  const s = (source ?? '').trim().toLowerCase()
  return s === 'info' || s.startsWith('info:') || s === 'info-page'
}

function hoursToMs(hours: number): number {
  return hours * 60 * 60 * 1000
}

/**
 * /info funnel timing (from registration = info pack sent):
 * - Welcome: +24h (handled by info-sequence-welcome)
 * - PP1: +48h from registration
 * - PP2–PP5: +48h from the previous pain-point email
 */
export function isInfoPainPointDue(params: {
  currentStep: number
  infoPackSentAt: string | null
  lastMailSentAt: string | null
  now?: Date
}): boolean {
  const now = params.now ?? new Date()

  if (params.currentStep === PAIN_POINT_1_STEP) {
    if (!params.infoPackSentAt) return false
    const dueAt =
      new Date(params.infoPackSentAt).getTime() + hoursToMs(INFO_SEQUENCE_PP_DELAY_HOURS)
    return now.getTime() >= dueAt
  }

  if (!params.lastMailSentAt) return false
  const dueAt =
    new Date(params.lastMailSentAt).getTime() + hoursToMs(INFO_SEQUENCE_PP_DELAY_HOURS)
  return now.getTime() >= dueAt
}

export function isInfoWelcomeDue(params: {
  infoPackSentAt: string | null
  now?: Date
}): boolean {
  if (!params.infoPackSentAt) return false
  const now = params.now ?? new Date()
  const dueAt =
    new Date(params.infoPackSentAt).getTime() + hoursToMs(INFO_SEQUENCE_WELCOME_DELAY_HOURS)
  return now.getTime() >= dueAt
}
