/**
 * Validación compartida para solicitudes de permiso (API / servidor).
 * Sin dependencias de React.
 */

export function parseLocalDateYmd(ymd: string): Date {
  const [y, m, d] = ymd.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Días decimales que aportaría una nueva solicitud (alineado a leaveUtils / backend). */
export function proposedDaysFromForm(input: {
  duration_type: 'hours' | 'days'
  start_date: string
  end_date: string
  duration_hours?: number
  is_half_day: boolean
}): number | null {
  if (!input.start_date || !input.end_date) return null
  if (input.duration_type === 'hours') {
    const h = input.is_half_day ? 4 : input.duration_hours || 8
    return h / 8
  }
  const start = parseLocalDateYmd(input.start_date)
  const end = parseLocalDateYmd(input.end_date)
  if (end < start) return null
  const diff = end.getTime() - start.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1
}

export function validateDateOrder(startYmd: string, endYmd: string): { ok: true } | { ok: false; message: string } {
  const start = new Date(startYmd)
  const end = new Date(endYmd)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { ok: false, message: 'Formato de fecha inválido' }
  }
  if (end < start) {
    return { ok: false, message: 'La fecha de fin no puede ser anterior a la fecha de inicio' }
  }
  return { ok: true }
}

export function validateDurationHoursBlock(input: {
  duration_type: 'hours' | 'days'
  is_half_day: boolean
  duration_hours?: number
}): { ok: true } | { ok: false; message: string } {
  if (input.duration_type !== 'hours') return { ok: true }
  if (input.is_half_day && input.duration_hours != null && input.duration_hours !== 4) {
    return { ok: false, message: 'Medio día debe ser exactamente 4 horas' }
  }
  if (
    !input.is_half_day &&
    (input.duration_hours == null || input.duration_hours <= 0 || input.duration_hours > 24)
  ) {
    return { ok: false, message: 'Las horas deben estar entre 1 y 24' }
  }
  return { ok: true }
}

/** Cálculo de days_requested como en POST /api/leave y /api/employees/me/permissions. */
export function computeDaysRequested(input: {
  duration_type: 'hours' | 'days'
  start_date: string
  end_date: string
  duration_hours?: number
  is_half_day: boolean
}): number | null {
  const proposed = proposedDaysFromForm(input)
  return proposed
}
