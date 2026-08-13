/** Hours after quote sent before post-cotización Nota #0. */
export const VENTAS_SEQUENCE_WELCOME_DELAY_HOURS = 24

/** Cadence between follow-up notes for /ventas leads. */
export const VENTAS_SEQUENCE_PP_DELAY_HOURS = 48

const PAIN_POINT_1_STEP = 1

export function isVentasAcceleratedLead(source?: string | null): boolean {
  const s = (source ?? '').trim().toLowerCase()
  return s === 'ventas' || s.startsWith('ventas:')
}

function hoursToMs(hours: number): number {
  return hours * 60 * 60 * 1000
}

export function isVentasPainPointDue(params: {
  currentStep: number
  packSentAt: string | null
  lastMailSentAt: string | null
  now?: Date
}): boolean {
  const now = params.now ?? new Date()

  if (params.currentStep === PAIN_POINT_1_STEP) {
    if (!params.packSentAt) return false
    const dueAt =
      new Date(params.packSentAt).getTime() + hoursToMs(VENTAS_SEQUENCE_PP_DELAY_HOURS)
    return now.getTime() >= dueAt
  }

  if (!params.lastMailSentAt) return false
  const dueAt =
    new Date(params.lastMailSentAt).getTime() + hoursToMs(VENTAS_SEQUENCE_PP_DELAY_HOURS)
  return now.getTime() >= dueAt
}

export function isVentasWelcomeDue(params: { packSentAt: string | null; now?: Date }): boolean {
  if (!params.packSentAt) return false
  const now = params.now ?? new Date()
  const dueAt =
    new Date(params.packSentAt).getTime() + hoursToMs(VENTAS_SEQUENCE_WELCOME_DELAY_HOURS)
  return now.getTime() >= dueAt
}
