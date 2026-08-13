/** Hours after trial activation before onboarding Nota #0. */
export const ACTIVAR_SEQUENCE_WELCOME_DELAY_HOURS = 24

/** Fixed cadence between Welcome → PP1 and PP1 → PP5 for /activar leads. */
export const ACTIVAR_SEQUENCE_PP_DELAY_HOURS = 48

const PAIN_POINT_1_STEP = 1

export function isActivarAcceleratedLead(source?: string | null): boolean {
  const s = (source ?? '').trim().toLowerCase()
  return s === 'activar' || s.startsWith('activaciones:') || s.startsWith('activar:')
}

function hoursToMs(hours: number): number {
  return hours * 60 * 60 * 1000
}

export function isActivarPainPointDue(params: {
  currentStep: number
  packSentAt: string | null
  lastMailSentAt: string | null
  now?: Date
}): boolean {
  const now = params.now ?? new Date()

  if (params.currentStep === PAIN_POINT_1_STEP) {
    if (!params.packSentAt) return false
    const dueAt =
      new Date(params.packSentAt).getTime() + hoursToMs(ACTIVAR_SEQUENCE_PP_DELAY_HOURS)
    return now.getTime() >= dueAt
  }

  if (!params.lastMailSentAt) return false
  const dueAt =
    new Date(params.lastMailSentAt).getTime() + hoursToMs(ACTIVAR_SEQUENCE_PP_DELAY_HOURS)
  return now.getTime() >= dueAt
}

export function isActivarWelcomeDue(params: { packSentAt: string | null; now?: Date }): boolean {
  if (!params.packSentAt) return false
  const now = params.now ?? new Date()
  const dueAt =
    new Date(params.packSentAt).getTime() + hoursToMs(ACTIVAR_SEQUENCE_WELCOME_DELAY_HOURS)
  return now.getTime() >= dueAt
}
