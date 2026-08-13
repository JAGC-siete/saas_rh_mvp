/**
 * Wrapper for attendance hours calculation (batch)
 * Calls calculate_attendance_hours_batch SQL function
 */

import { createAdminClient } from '../supabase/server'
import {
  computeExpectedMinutesForDate,
  computeExpectedMinutesForDay,
  getDayConfigForDate,
  legacyScheduleToShiftConfig,
  resolveImplicitBreakMinutes,
  type LegacyScheduleColumns,
  type ShiftDayConfig,
} from './shift-config'

export {
  computeExpectedMinutesForDate,
  computeExpectedMinutesForDay,
  getDayConfigForDate,
  legacyScheduleToShiftConfig,
  resolveImplicitBreakMinutes,
}
export type { LegacyScheduleColumns, ShiftDayConfig }

export interface AttendanceHoursResult {
  attendance_record_id: string
  calculation_id: string
  total_hours: number
  normal_hours: number
  overtime_diurno_hours: number
  overtime_nocturno_hours: number
  overtime_feriado_hours: number
  overtime_evening_25_hours?: number
  overtime_night_50_hours?: number
  overtime_late_75_hours?: number
  overtime_morning_25_hours?: number
  overtime_holiday_100_hours?: number
}

/**
 * Calculate attendance hours for a batch of records
 * Optimized: labor_laws loaded ONCE, not per record
 */
export async function calculateAttendanceHoursBatch(
  recordIds: string[],
  lawYear?: number,
  supabase?: any
): Promise<AttendanceHoursResult[]> {
  const client = supabase ?? createAdminClient()

  const { data, error } = await client.rpc('calculate_attendance_hours_batch', {
    p_record_ids: recordIds,
    p_law_year: lawYear ?? new Date().getFullYear(),
  })

  if (error) {
    throw new Error(`calculate_attendance_hours_batch failed: ${error.message}`)
  }

  return (data ?? []) as AttendanceHoursResult[]
}

/**
 * Calculate attendance hours for all records of a given date
 * Used by cron job (end of day)
 */
export async function calculateAttendanceHoursForDate(
  date: string,
  supabase?: any
): Promise<number> {
  const client = supabase ?? createAdminClient()

  const { data: records, error: fetchError } = await client
    .from('attendance_records')
    .select('id')
    .eq('date', date)
    .not('check_in', 'is', null)
    .not('check_out', 'is', null)

  if (fetchError || !records?.length) {
    return 0
  }

  const recordIds = records.map((r: { id: string }) => r.id)
  const results = await calculateAttendanceHoursBatch(recordIds, undefined, client)
  return results.length
}

/**
 * Same as calculateAttendanceHoursForDate but scoped to one company (multi-tenant safe).
 */
export async function calculateAttendanceHoursForCompanyAndDate(
  companyId: string,
  date: string,
  supabase?: any
): Promise<number> {
  const client = supabase ?? createAdminClient()

  const { data: emps, error: e1 } = await client
    .from('employees')
    .select('id')
    .eq('company_id', companyId)
    .eq('status', 'active')

  if (e1 || !emps?.length) return 0

  const ids = emps.map((r: { id: string }) => r.id)

  const { data: records, error: e2 } = await client
    .from('attendance_records')
    .select('id')
    .eq('date', date)
    .in('employee_id', ids)
    .not('check_in', 'is', null)
    .not('check_out', 'is', null)

  if (e2 || !records?.length) return 0

  const recordIds = records.map((r: { id: string }) => r.id)
  const results = await calculateAttendanceHoursBatch(recordIds, undefined, client)
  return results.length
}

/**
 * Expected scheduled minutes for a date from shift_config topology.
 * off → 0, continuous → (end - start) - break, split → sum of blocks.
 */
export function getExpectedScheduledMinutes(
  schedule: LegacyScheduleColumns,
  dateStr: string
): number {
  return computeExpectedMinutesForDate(schedule, dateStr)
}

/**
 * Break minutes to subtract when lunch punches are absent.
 */
export function getImplicitBreakMinutesForDate(
  schedule: LegacyScheduleColumns,
  dateStr: string
): number {
  const day = getDayConfigForDate(schedule, dateStr)
  return resolveImplicitBreakMinutes(day, schedule.break_duration ?? 60)
}
