import { DateTime } from 'luxon'

/**
 * Max |delta| still counted as early/late vs schedule start.
 * Wider than best-fit (90m): a 1–3h late arrival is still KPI "tarde".
 * Night punches vs morning start (~6h+) stay outside the window.
 */
export const LATE_MINUTES_MAX_ABS_MINUTES = 240

/** Parse "HH:MM" / "HH:MM:SS" → minutes from midnight. */
export function parseHhmmToMinutes(time: string | null | undefined): number | null {
  if (!time || typeof time !== 'string') return null
  const parts = time.split(':').map((x) => parseInt(x, 10))
  if (parts.length < 2) return null
  const [h, m] = parts
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  return h * 60 + m
}

/** Normalize to HH:MM:SS for Postgres TIME columns. */
export function normalizeTimeForDb(time: string | null | undefined): string | null {
  if (!time) return null
  const parts = time.split(':')
  if (parts.length < 2) return null
  const h = parts[0].padStart(2, '0')
  const m = (parts[1] || '00').padStart(2, '0')
  const s = (parts[2] || '00').padStart(2, '0')
  return `${h}:${m}:${s}`
}

/**
 * Signed minutes vs expected start in company timezone.
 * Positive = late, negative = early. Matches decideCheckInRule / KPI (>5 late, <-5 early).
 * Returns null when inputs are incomplete/invalid.
 */
export function computeSignedLateMinutes(params: {
  checkInIso: string
  expectedStart: string
  timeZone?: string
}): number | null {
  const { checkInIso, expectedStart, timeZone = 'America/Tegucigalpa' } = params
  const expectedMins = parseHhmmToMinutes(expectedStart)
  if (expectedMins == null) return null

  const dt = DateTime.fromISO(checkInIso, { zone: 'utc' }).setZone(timeZone)
  if (!dt.isValid) return null

  const actualMins = dt.hour * 60 + dt.minute
  return actualMins - expectedMins
}

export type LateMinutesForRecordInput = {
  checkInIso: string | null | undefined
  expectedStart: string | null | undefined
  shiftType?: string | null
  timeZone?: string
  /** Reject deltas outside this window (default 240m) to avoid night punches vs morning start. */
  maxAbsMinutes?: number
}

/**
 * Values to persist on attendance_records for biometric/daily-close materialization.
 * Flex schedules skip tardiness (same as manual register path).
 * If |delta| exceeds maxAbsMinutes, store expected but late_minutes=0 (punch not in start window).
 */
export function lateFieldsForAttendanceRecord(input: LateMinutesForRecordInput): {
  expected_check_in: string | null
  late_minutes: number | null
  outside_start_window?: boolean
} {
  const shift = (input.shiftType || 'normal').toLowerCase()
  if (shift === 'flex') {
    return { expected_check_in: null, late_minutes: null }
  }
  if (!input.checkInIso || !input.expectedStart) {
    return { expected_check_in: null, late_minutes: null }
  }
  const late = computeSignedLateMinutes({
    checkInIso: input.checkInIso,
    expectedStart: input.expectedStart,
    timeZone: input.timeZone,
  })
  if (late == null) {
    return { expected_check_in: null, late_minutes: null }
  }
  const maxAbs = input.maxAbsMinutes ?? LATE_MINUTES_MAX_ABS_MINUTES
  const expected = normalizeTimeForDb(input.expectedStart)
  if (Math.abs(late) > maxAbs) {
    return {
      expected_check_in: expected,
      late_minutes: 0,
      outside_start_window: true,
    }
  }
  return {
    expected_check_in: expected,
    late_minutes: late,
  }
}
