import { dayKeyFromDate, legacyScheduleToShiftConfig, type LegacyScheduleColumns } from './shift-config'

export type ScheduleTimesForDate = {
  type: 'off' | 'continuous' | 'split'
  start: string | null
  end: string | null
  m_start?: string | null
  m_end?: string | null
  a_start?: string | null
  a_end?: string | null
}

/** Expected punch windows for a calendar date from a work_schedules row. */
export function getScheduleTimesForDate(
  schedule: LegacyScheduleColumns | null | undefined,
  localDate: string
): ScheduleTimesForDate {
  if (!schedule) return { type: 'off', start: null, end: null }

  const dayKey = dayKeyFromDate(localDate)
  const config = legacyScheduleToShiftConfig(schedule)
  const day = config[dayKey]

  if (!day || day.type === 'off') {
    return { type: 'off', start: null, end: null }
  }

  if (day.type === 'split') {
    return {
      type: 'split',
      start: day.m_start,
      end: day.a_end,
      m_start: day.m_start,
      m_end: day.m_end,
      a_start: day.a_start,
      a_end: day.a_end,
    }
  }

  return { type: 'continuous', start: day.start, end: day.end }
}

export function isRestDayForDate(schedule: LegacyScheduleColumns | null | undefined, localDate: string): boolean {
  return getScheduleTimesForDate(schedule, localDate).type === 'off'
}
