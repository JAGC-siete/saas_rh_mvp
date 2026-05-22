import { resolveEffectiveWorkScheduleId, type EffectiveScheduleResult } from './effective-work-schedule'
import { getScheduleTimesForDate, type ScheduleTimesForDate } from './schedule-times'
import type { LegacyScheduleColumns } from './shift-config'

export type WorkScheduleRow = LegacyScheduleColumns & {
  id: string
  name?: string | null
  shift_type?: string | null
  late_grace_minutes?: number | null
  early_grace_minutes?: number | null
  grace_minutes?: number | null
  late_to_inclusive?: number | null
  oor_from_minutes?: number | null
  checkin_open?: string | null
  checkin_close?: string | null
}

export type LoadedEffectiveSchedule = {
  result: EffectiveScheduleResult
  schedule: WorkScheduleRow | null
  times: ScheduleTimesForDate
}

export const WORK_SCHEDULE_EFFECTIVE_SELECT =
  'id, name, monday_start, monday_end, tuesday_start, tuesday_end, wednesday_start, wednesday_end, thursday_start, thursday_end, friday_start, friday_end, saturday_start, sunday_end, shift_config, break_duration, shift_type, late_grace_minutes, early_grace_minutes, grace_minutes, late_to_inclusive, oor_from_minutes, checkin_open, checkin_close'

/** Resolve assignment → work_schedule_id, then load row + per-day times. */
export async function loadEffectiveWorkSchedule(params: {
  supabase: { from: (t: string) => any }
  companyId: string
  employeeId: string
  date: string
  fallbackWorkScheduleId?: string | null
}): Promise<LoadedEffectiveSchedule> {
  const result = await resolveEffectiveWorkScheduleId(params)

  if (!result.found || !result.workScheduleId) {
    return {
      result,
      schedule: null,
      times: { type: 'off', start: null, end: null },
    }
  }

  const { data: schedule, error } = await params.supabase
    .from('work_schedules')
    .select(WORK_SCHEDULE_EFFECTIVE_SELECT)
    .eq('id', result.workScheduleId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  const row = (schedule as WorkScheduleRow | null) ?? null
  return {
    result,
    schedule: row,
    times: getScheduleTimesForDate(row, params.date),
  }
}

export function expectedCheckInFromLoaded(loaded: LoadedEffectiveSchedule): string | null {
  return loaded.times.start
}

export function expectedCheckOutFromLoaded(loaded: LoadedEffectiveSchedule): string | null {
  return loaded.times.end
}

const PORTAL_DAY_KEYS = [
  'monday_start', 'monday_end', 'tuesday_start', 'tuesday_end',
  'wednesday_start', 'wednesday_end', 'thursday_start', 'thursday_end',
  'friday_start', 'friday_end', 'saturday_start', 'saturday_end',
  'sunday_start', 'sunday_end',
] as const

/** Shape used by employee portal APIs (profile + dashboard). */
export function workScheduleToPortalPayload(
  row: WorkScheduleRow | null | undefined,
  loaded?: LoadedEffectiveSchedule | null
) {
  if (!row) return undefined
  const base: Record<string, unknown> = {
    id: row.id,
    name: row.name ?? undefined,
  }
  for (const key of PORTAL_DAY_KEYS) {
    base[key] = row[key] ?? undefined
  }
  if (loaded) {
    base.schedule_source = loaded.result.source
    base.today_start = loaded.times.start
    base.today_end = loaded.times.end
    base.day_type = loaded.times.type
  }
  return base
}
