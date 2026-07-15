/**
 * Clasifica minutos de HE por franja horaria (reloj local) para nómina HN.
 *
 * Franjas:
 * - 17:00–18:59 → evening_25 (25%)
 * - 19:00–21:59 → night_50 (50%)
 * - 22:00–04:59 → late_75 (75%)
 * - 05:00–07:59 → morning_25 (25%)
 * - Feriado (todo el OT) → holiday_100 (100%)
 * - Cualquier otro horario (p. ej. 08:00–16:59) → evening_25 (mismo 25%)
 */

import type { OvertimeHoursBreakdown } from '../payroll/overtime-pay'
import { emptyOvertimeBreakdown } from '../payroll/overtime-pay'

export type WorkedInterval = { startMs: number; endMs: number }

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/** Minute-of-day 0..1439 in IANA timezone for an instant. */
export function localMinuteOfDay(unixMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(new Date(unixMs))
  const hour = Number(parts.find((p) => p.type === 'hour')?.value || 0)
  const minute = Number(parts.find((p) => p.type === 'minute')?.value || 0)
  return hour * 60 + minute
}

export type OvertimeBandKey =
  | 'evening_25'
  | 'night_50'
  | 'late_75'
  | 'morning_25'
  | 'holiday_100'

/** Classify a local minute-of-day into a premium band (non-holiday). */
export function classifyLocalMinuteBand(
  minuteOfDay: number
): Exclude<OvertimeBandKey, 'holiday_100'> {
  const m = ((minuteOfDay % 1440) + 1440) % 1440
  if (m >= 17 * 60 && m < 19 * 60) return 'evening_25' // 17:00–18:59
  if (m >= 19 * 60 && m < 22 * 60) return 'night_50' // 19:00–21:59
  if (m >= 22 * 60 || m < 5 * 60) return 'late_75' // 22:00–04:59
  if (m >= 5 * 60 && m < 8 * 60) return 'morning_25' // 05:00–07:59
  return 'evening_25' // daytime OT @ 25%
}

/**
 * Build worked intervals excluding lunch.
 * Inputs are unix ms (from Date.getTime() / timestamptz epoch).
 */
export function buildWorkedIntervals(input: {
  checkInMs: number
  checkOutMs: number
  lunchStartMs?: number | null
  lunchEndMs?: number | null
}): WorkedInterval[] {
  const { checkInMs, checkOutMs, lunchStartMs, lunchEndMs } = input
  if (!(checkOutMs > checkInMs)) return []

  if (
    lunchStartMs != null &&
    lunchEndMs != null &&
    lunchStartMs > checkInMs &&
    lunchEndMs < checkOutMs &&
    lunchEndMs > lunchStartMs
  ) {
    return [
      { startMs: checkInMs, endMs: lunchStartMs },
      { startMs: lunchEndMs, endMs: checkOutMs },
    ]
  }
  return [{ startMs: checkInMs, endMs: checkOutMs }]
}

/** Next band boundary after `unixMs` in local TZ (ms), exclusive end of current band slice. */
function nextBandBoundaryMs(unixMs: number, timeZone: string): number {
  const mod = localMinuteOfDay(unixMs, timeZone)
  const boundaries = [5 * 60, 8 * 60, 17 * 60, 19 * 60, 22 * 60, 24 * 60]
  let nextMod = boundaries.find((b) => b > mod)
  if (nextMod == null) nextMod = 24 * 60
  const deltaMin = nextMod - mod
  return unixMs + deltaMin * 60_000
}

function addMsToBand(
  out: OvertimeHoursBreakdown,
  band: Exclude<OvertimeBandKey, 'holiday_100'> | 'holiday_100',
  ms: number
) {
  const hours = ms / 3_600_000
  out[band] += hours
}

/**
 * After ordinary hours (cap), allocate remaining worked time into OT bands by clock.
 */
export function allocateOvertimeByClockBands(input: {
  checkInMs: number
  checkOutMs: number
  lunchStartMs?: number | null
  lunchEndMs?: number | null
  /** Horas ordinarias del día (tope), ya resuelto (p. ej. 8) */
  ordinaryCapHours: number
  isHoliday: boolean
  timeZone: string
}): OvertimeHoursBreakdown {
  const out = emptyOvertimeBreakdown()
  const intervals = buildWorkedIntervals(input)
  if (intervals.length === 0) return out

  const capMs = Math.max(0, (Number(input.ordinaryCapHours) || 0) * 3_600_000)
  let ordinaryMsUsed = 0

  for (const iv of intervals) {
    let cursor = iv.startMs
    while (cursor < iv.endMs) {
      const remaining = iv.endMs - cursor
      if (ordinaryMsUsed < capMs) {
        const take = Math.min(remaining, capMs - ordinaryMsUsed)
        ordinaryMsUsed += take
        cursor += take
        continue
      }

      // OT: slice by band boundaries
      if (input.isHoliday) {
        addMsToBand(out, 'holiday_100', remaining)
        break
      }

      const bandEnd = Math.min(iv.endMs, nextBandBoundaryMs(cursor, input.timeZone))
      const slice = Math.max(0, bandEnd - cursor)
      if (slice <= 0) {
        cursor += 60_000
        continue
      }
      const band = classifyLocalMinuteBand(localMinuteOfDay(cursor, input.timeZone))
      addMsToBand(out, band, slice)
      cursor = bandEnd
    }
  }

  return {
    evening_25: round2(out.evening_25),
    night_50: round2(out.night_50),
    late_75: round2(out.late_75),
    morning_25: round2(out.morning_25),
    holiday_100: round2(out.holiday_100),
  }
}

/** Map AHC row (new band columns preferred; legacy diurno/nocturno/feriado until recalc). */
export function ahcRowToOvertimeBreakdown(row: {
  overtime_evening_25_hours?: number | null
  overtime_night_50_hours?: number | null
  overtime_late_75_hours?: number | null
  overtime_morning_25_hours?: number | null
  overtime_holiday_100_hours?: number | null
  overtime_diurno_hours?: number | null
  overtime_nocturno_hours?: number | null
  overtime_feriado_hours?: number | null
}): OvertimeHoursBreakdown {
  const bands: OvertimeHoursBreakdown = {
    evening_25: Math.max(0, Number(row.overtime_evening_25_hours) || 0),
    night_50: Math.max(0, Number(row.overtime_night_50_hours) || 0),
    late_75: Math.max(0, Number(row.overtime_late_75_hours) || 0),
    morning_25: Math.max(0, Number(row.overtime_morning_25_hours) || 0),
    holiday_100: Math.max(0, Number(row.overtime_holiday_100_hours) || 0),
  }
  const bandSum =
    bands.evening_25 + bands.night_50 + bands.late_75 + bands.morning_25 + bands.holiday_100
  if (bandSum > 0) return bands

  return {
    evening_25: Math.max(0, Number(row.overtime_diurno_hours) || 0),
    night_50: Math.max(0, Number(row.overtime_nocturno_hours) || 0),
    late_75: 0,
    morning_25: 0,
    holiday_100: Math.max(0, Number(row.overtime_feriado_hours) || 0),
  }
}
