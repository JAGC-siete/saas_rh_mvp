import type { EffectiveScheduleResult } from './effective-work-schedule'

export type AssignmentCandidate = {
  employee_id?: string
  work_schedule_id: string
  valid_from: string
  valid_to: string
  repeat_weekly?: boolean | null
  repeat_weekdays?: number[] | null
}

function isIsoDateOnly(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s)
}

function matchesWeekdayRule(row: AssignmentCandidate, date: string): boolean {
  if (!row.repeat_weekly) return true
  const weekdays = Array.isArray(row.repeat_weekdays) ? row.repeat_weekdays : null
  if (!weekdays || weekdays.length === 0) return true
  const dow = new Date(`${date}T12:00:00.000Z`).getUTCDay()
  return weekdays.includes(dow)
}

/** In-memory resolver (no DB) for batch payroll / daily-close. */
export function resolveEffectiveWorkScheduleIdFromAssignments(params: {
  assignments: AssignmentCandidate[]
  date: string
  fallbackWorkScheduleId?: string | null
}): EffectiveScheduleResult {
  const { assignments, date, fallbackWorkScheduleId } = params
  if (!isIsoDateOnly(date)) {
    return { found: false, workScheduleId: null, source: 'none' }
  }

  const inRange = assignments
    .filter((r) => r.valid_from <= date && r.valid_to >= date)
    .sort((a, b) => b.valid_from.localeCompare(a.valid_from))

  for (const row of inRange) {
    if (!matchesWeekdayRule(row, date)) continue
    if (typeof row.work_schedule_id === 'string' && row.work_schedule_id) {
      return { found: true, workScheduleId: row.work_schedule_id, source: 'assignment' }
    }
  }

  if (typeof fallbackWorkScheduleId === 'string' && fallbackWorkScheduleId) {
    return { found: true, workScheduleId: fallbackWorkScheduleId, source: 'employee_default' }
  }

  return { found: false, workScheduleId: null, source: 'none' }
}

export async function loadEmployeeScheduleAssignments(params: {
  supabase: { from: (t: string) => any }
  companyId: string
  employeeIds: string[]
  rangeFrom: string
  rangeTo: string
}): Promise<Map<string, AssignmentCandidate[]>> {
  const { supabase, companyId, employeeIds, rangeFrom, rangeTo } = params
  const out = new Map<string, AssignmentCandidate[]>()
  if (employeeIds.length === 0) return out

  const { data } = await supabase
    .from('employee_schedule_assignments')
    .select('employee_id, work_schedule_id, valid_from, valid_to, repeat_weekly, repeat_weekdays')
    .eq('company_id', companyId)
    .in('employee_id', employeeIds)
    .lte('valid_from', rangeTo)
    .gte('valid_to', rangeFrom)

  for (const row of (data || []) as (AssignmentCandidate & { employee_id: string })[]) {
    const list = out.get(row.employee_id) || []
    list.push(row)
    out.set(row.employee_id, list)
  }
  return out
}
