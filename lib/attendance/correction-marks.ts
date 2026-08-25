/**
 * Marcas de corrección ancladas al día laboral (America/Tegucigalpa).
 * La Fecha de la solicitud manda; la hora no puede saltar de año.
 */

import { DateTime } from 'luxon'
import { DEFAULT_ATTENDANCE_TIMEZONE } from './attendance-metadata'
import { lateFieldsForAttendanceRecord } from './compute-late-minutes'

export const CORRECTED_FIELD_KEYS = ['check_in', 'check_out', 'lunch_start', 'lunch_end'] as const
export type CorrectedField = (typeof CORRECTED_FIELD_KEYS)[number]

export type CorrectionMarkTimes = {
  check_in: string | null
  check_out: string | null
  lunch_start: string | null
  lunch_end: string | null
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/

function blankToNull(value: string | null | undefined): string | null {
  if (value == null) return null
  const t = String(value).trim()
  return t ? t : null
}

export function addIsoDateDays(date: string, days: number): string {
  const dt = DateTime.fromISO(date, { zone: 'utc' })
  if (!dt.isValid) return date
  return dt.plus({ days }).toISODate() ?? date
}

export function combineDateAndTimeToIso(
  date: string,
  time: string,
  timeZone = DEFAULT_ATTENDANCE_TIMEZONE
): string | null {
  const t = blankToNull(time)
  if (!DATE_RE.test(date) || !t || !TIME_RE.test(t)) return null
  const dt = DateTime.fromISO(`${date}T${t}`, { zone: timeZone })
  if (!dt.isValid) return null
  return dt.toUTC().toISO({ suppressMilliseconds: false })
}

function stampOnOrAfter(
  date: string,
  time: string | null | undefined,
  afterIso: string | null,
  timeZone: string
): string | null {
  const t = blankToNull(time)
  if (!t) return null
  const sameDay = combineDateAndTimeToIso(date, t, timeZone)
  if (!sameDay) return null
  if (!afterIso) return sameDay
  const same = DateTime.fromISO(sameDay)
  const prev = DateTime.fromISO(afterIso)
  if (same.isValid && prev.isValid && same > prev) return sameDay
  return combineDateAndTimeToIso(addIsoDateDays(date, 1), t, timeZone)
}

/** Combina Fecha + horas locales HN. Salida/almuerzo < entrada → día siguiente. */
export function composeCorrectionTimestamps(input: {
  date: string
  checkInTime?: string | null
  checkOutTime?: string | null
  lunchStartTime?: string | null
  lunchEndTime?: string | null
  timeZone?: string
}): CorrectionMarkTimes {
  const timeZone = input.timeZone ?? DEFAULT_ATTENDANCE_TIMEZONE
  const date = input.date
  const check_in = blankToNull(input.checkInTime)
    ? combineDateAndTimeToIso(date, input.checkInTime as string, timeZone)
    : null
  const lunch_start = stampOnOrAfter(date, input.lunchStartTime, check_in, timeZone)
  const lunch_end = stampOnOrAfter(date, input.lunchEndTime, lunch_start ?? check_in, timeZone)
  const check_out = stampOnOrAfter(
    date,
    input.checkOutTime,
    lunch_end ?? lunch_start ?? check_in,
    timeZone
  )
  return { check_in, check_out, lunch_start, lunch_end }
}

export function localDateOfIso(
  iso: string | null | undefined,
  timeZone = DEFAULT_ATTENDANCE_TIMEZONE
): string | null {
  const v = blankToNull(iso)
  if (!v) return null
  const dt = DateTime.fromISO(v, { setZone: true }).setZone(timeZone)
  if (!dt.isValid) return null
  return dt.toISODate()
}

export function isoToHmLocal(
  iso: string | null | undefined,
  timeZone = DEFAULT_ATTENDANCE_TIMEZONE
): string {
  const v = blankToNull(iso)
  if (!v) return ''
  const dt = DateTime.fromISO(v, { setZone: true }).setZone(timeZone)
  if (!dt.isValid) return ''
  return dt.toFormat('HH:mm')
}

export function formatCorrectionMarkDisplay(
  iso: string | null | undefined,
  workDate: string,
  timeZone = DEFAULT_ATTENDANCE_TIMEZONE
): string {
  const hm = isoToHmLocal(iso, timeZone)
  if (!hm) return '—'
  const localDate = localDateOfIso(iso, timeZone)
  if (localDate && DATE_RE.test(workDate) && localDate !== workDate) return `${hm} (+1)`
  return hm
}

/** Entrada debe ser `date`. Salida/almuerzo: `date` o `date+1` (turno cruzado). */
export function getCorrectionDateAnchorError(params: {
  date: string
  check_in?: string | null
  check_out?: string | null
  lunch_start?: string | null
  lunch_end?: string | null
  timeZone?: string
}): string | null {
  if (!DATE_RE.test(params.date)) return 'date inválido (YYYY-MM-DD)'
  const timeZone = params.timeZone ?? DEFAULT_ATTENDANCE_TIMEZONE
  const next = addIsoDateDays(params.date, 1)

  const check = (
    iso: string | null | undefined,
    allowNext: boolean,
    label: string
  ): string | null => {
    if (!blankToNull(iso)) return null
    const local = localDateOfIso(iso, timeZone)
    if (!local) return `${label} inválida.`
    if (local === params.date) return null
    if (allowNext && local === next) return null
    return `${label} debe corresponder al día ${params.date}.`
  }

  return (
    check(params.check_in, false, 'Entrada') ||
    check(params.check_out, true, 'Salida') ||
    check(params.lunch_start, true, 'Inicio de almuerzo') ||
    check(params.lunch_end, true, 'Fin de almuerzo')
  )
}

export function parseCorrectedFields(flags: unknown): CorrectedField[] {
  const raw =
    flags && typeof flags === 'object' && !Array.isArray(flags)
      ? (flags as { corrected_fields?: unknown }).corrected_fields
      : undefined
  if (!Array.isArray(raw)) return []
  return raw.filter((x): x is CorrectedField =>
    typeof x === 'string' && (CORRECTED_FIELD_KEYS as readonly string[]).includes(x)
  )
}

export function collectCorrectedFields(proposed: {
  proposed_check_in?: string | null
  proposed_check_out?: string | null
  proposed_lunch_start?: string | null
  proposed_lunch_end?: string | null
}): CorrectedField[] {
  const out: CorrectedField[] = []
  if (blankToNull(proposed.proposed_check_in)) out.push('check_in')
  if (blankToNull(proposed.proposed_check_out)) out.push('check_out')
  if (blankToNull(proposed.proposed_lunch_start)) out.push('lunch_start')
  if (blankToNull(proposed.proposed_lunch_end)) out.push('lunch_end')
  return out
}

export function mergeCorrectedFields(prevFlags: unknown, next: CorrectedField[]): CorrectedField[] {
  return [...new Set([...parseCorrectedFields(prevFlags), ...next])]
}

export function applyCorrectedMarkFields(
  mapped: CorrectionMarkTimes,
  existing: Partial<CorrectionMarkTimes> | null | undefined,
  flags: unknown
): CorrectionMarkTimes {
  const fields = parseCorrectedFields(flags)
  const out: CorrectionMarkTimes = { ...mapped }
  for (const f of fields) {
    const kept = existing?.[f]
    if (kept != null && String(kept).trim()) out[f] = kept
  }
  return out
}

export function statusFromAttendanceMarks(marks: {
  check_in: string | null
  check_out: string | null
}): 'present' | 'partial' | 'absent' {
  if (!marks.check_in) return 'absent'
  if (!marks.check_out) return 'partial'
  return 'present'
}

export function buildApprovedAttendancePatch(params: {
  existing: (Partial<CorrectionMarkTimes> & { flags?: unknown }) | null
  proposed: {
    proposed_check_in?: string | null
    proposed_check_out?: string | null
    proposed_lunch_start?: string | null
    proposed_lunch_end?: string | null
  }
  expectedStart: string | null
  shiftType?: string | null
  timeZone?: string
}): {
  marks: CorrectionMarkTimes
  status: 'present' | 'partial' | 'absent'
  late_minutes: number
  expected_check_in: string | null
  flags: Record<string, unknown>
  corrected_fields: CorrectedField[]
} {
  const timeZone = params.timeZone ?? DEFAULT_ATTENDANCE_TIMEZONE
  const marks: CorrectionMarkTimes = {
    check_in: params.proposed.proposed_check_in ?? params.existing?.check_in ?? null,
    check_out: params.proposed.proposed_check_out ?? params.existing?.check_out ?? null,
    lunch_start: params.proposed.proposed_lunch_start ?? params.existing?.lunch_start ?? null,
    lunch_end: params.proposed.proposed_lunch_end ?? params.existing?.lunch_end ?? null,
  }
  const corrected_fields = mergeCorrectedFields(
    params.existing?.flags,
    collectCorrectedFields(params.proposed)
  )
  const late = lateFieldsForAttendanceRecord({
    checkInIso: marks.check_in,
    expectedStart: params.expectedStart,
    shiftType: params.shiftType,
    timeZone,
  })
  const status = statusFromAttendanceMarks(marks)
  const prevFlags =
    params.existing?.flags && typeof params.existing.flags === 'object' && !Array.isArray(params.existing.flags)
      ? { ...(params.existing.flags as Record<string, unknown>) }
      : {}
  if (status !== 'absent') prevFlags.daily_close_absent = false
  return {
    marks,
    status,
    late_minutes: late.late_minutes ?? 0,
    expected_check_in: late.expected_check_in,
    flags: { ...prevFlags, corrected_fields },
    corrected_fields,
  }
}
