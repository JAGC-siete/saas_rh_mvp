/**
 * Valida coherencia de marcas de asistencia (entrada/salida/almuerzo)
 * para evitar horas normales negativas al recalcular AHC.
 */

export type AttendanceMarks = {
  check_in: string | null | undefined
  check_out: string | null | undefined
  lunch_start: string | null | undefined
  lunch_end: string | null | undefined
}

function parseTs(value: string | null | undefined): Date | null {
  if (!value || !String(value).trim()) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

/**
 * @returns mensaje de error en español, o null si es válido / incompleto sin conflicto
 */
export function getAttendanceMarksValidationError(marks: AttendanceMarks): string | null {
  const checkIn = parseTs(marks.check_in)
  const checkOut = parseTs(marks.check_out)
  const lunchStart = parseTs(marks.lunch_start)
  const lunchEnd = parseTs(marks.lunch_end)

  if (marks.check_in && !checkIn) return 'Entrada inválida.'
  if (marks.check_out && !checkOut) return 'Salida inválida.'
  if (marks.lunch_start && !lunchStart) return 'Inicio de almuerzo inválido.'
  if (marks.lunch_end && !lunchEnd) return 'Fin de almuerzo inválido.'

  if (checkIn && checkOut && checkOut.getTime() <= checkIn.getTime()) {
    return 'La salida debe ser posterior a la entrada.'
  }

  const hasLunchStart = !!lunchStart
  const hasLunchEnd = !!lunchEnd
  if (hasLunchStart !== hasLunchEnd) {
    return 'Indique inicio y fin de almuerzo, o deje ambos vacíos.'
  }

  if (lunchStart && lunchEnd && lunchEnd.getTime() <= lunchStart.getTime()) {
    return 'El fin de almuerzo debe ser posterior al inicio.'
  }

  if (checkIn && checkOut && lunchStart && lunchEnd) {
    if (lunchStart.getTime() <= checkIn.getTime() || lunchEnd.getTime() >= checkOut.getTime()) {
      return 'El almuerzo debe quedar entre la entrada y la salida (Entrada < Inicio almuerzo < Fin almuerzo < Salida).'
    }

    const workMs = checkOut.getTime() - checkIn.getTime()
    const lunchMs = lunchEnd.getTime() - lunchStart.getTime()
    if (workMs - lunchMs < 0) {
      return 'El almuerzo dura más que el tiempo entre entrada y salida; las horas quedarían negativas.'
    }
  }

  return null
}

/** Traduce errores crudos de Postgres/RPC a mensaje operable. */
export function humanizeAttendanceHoursCalcError(message: string): string {
  const m = message || ''
  if (m.includes('normal_hours_non_negative') || m.includes('hours_non_negative')) {
    return 'Las horas resultantes serían negativas. Revise que el almuerzo esté entre la entrada y la salida.'
  }
  return m
}
