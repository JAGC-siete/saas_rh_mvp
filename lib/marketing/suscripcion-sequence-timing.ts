/** Hours after suscripcion pack before Step 0 (Welcome). */
export const SUSCRIPCION_SEQUENCE_WELCOME_DELAY_HOURS = 24

/** Fixed cadence between Welcome → PP1 and PP1 → PP5 for /suscripcion leads. */
export const SUSCRIPCION_SEQUENCE_PP_DELAY_HOURS = 48

const PAIN_POINT_1_STEP = 1

export function isSuscripcionAcceleratedLead(source?: string | null): boolean {
  const s = (source ?? '').trim().toLowerCase()
  if (s === 'info' || s.startsWith('info:') || s === 'info-page') return false
  if (s === 'activar' || s.startsWith('activaciones:') || s.startsWith('activar:')) return false
  if (s === 'ventas' || s.startsWith('ventas:')) return false
  return true
}

function hoursToMs(hours: number): number {
  return hours * 60 * 60 * 1000
}

export function isSuscripcionPainPointDue(params: {
  currentStep: number
  packSentAt: string | null
  lastMailSentAt: string | null
  now?: Date
}): boolean {
  const now = params.now ?? new Date()

  if (params.currentStep === PAIN_POINT_1_STEP) {
    if (!params.packSentAt) return false
    const dueAt =
      new Date(params.packSentAt).getTime() + hoursToMs(SUSCRIPCION_SEQUENCE_PP_DELAY_HOURS)
    return now.getTime() >= dueAt
  }

  if (!params.lastMailSentAt) return false
  const dueAt =
    new Date(params.lastMailSentAt).getTime() + hoursToMs(SUSCRIPCION_SEQUENCE_PP_DELAY_HOURS)
  return now.getTime() >= dueAt
}

export function isSuscripcionWelcomeDue(params: {
  packSentAt: string | null
  now?: Date
}): boolean {
  if (!params.packSentAt) return false
  const now = params.now ?? new Date()
  const dueAt =
    new Date(params.packSentAt).getTime() + hoursToMs(SUSCRIPCION_SEQUENCE_WELCOME_DELAY_HOURS)
  return now.getTime() >= dueAt
}
