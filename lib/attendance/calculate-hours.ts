/**
 * Wrapper for attendance hours calculation (batch)
 * Calls calculate_attendance_hours_batch SQL function
 */

import { createAdminClient } from '../supabase/server'

export interface AttendanceHoursResult {
  attendance_record_id: string
  calculation_id: string
  total_hours: number
  normal_hours: number
  overtime_diurno_hours: number
  overtime_nocturno_hours: number
  overtime_feriado_hours: number
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
