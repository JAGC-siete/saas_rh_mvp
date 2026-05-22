export type EffectiveScheduleResult =
  | { found: true; workScheduleId: string; source: 'assignment' | 'employee_default' }
  | { found: false; workScheduleId: null; source: 'none' }

function isIsoDateOnly(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s)
}

export async function resolveEffectiveWorkScheduleId(params: {
  supabase: { from: (t: string) => any }
  companyId: string
  employeeId: string
  date: string // YYYY-MM-DD
  fallbackWorkScheduleId?: string | null
}): Promise<EffectiveScheduleResult> {
  const { supabase, companyId, employeeId, date, fallbackWorkScheduleId } = params
  if (!isIsoDateOnly(date)) {
    return { found: false, workScheduleId: null, source: 'none' }
  }

  // Try assignment first
  const { data: rows } = await supabase
    .from('employee_schedule_assignments')
    .select('work_schedule_id, valid_from, valid_to, repeat_weekly, repeat_weekdays')
    .eq('company_id', companyId)
    .eq('employee_id', employeeId)
    .lte('valid_from', date)
    .gte('valid_to', date)
    .order('valid_from', { ascending: false })

  if (Array.isArray(rows) && rows.length > 0) {
    const d = new Date(`${date}T12:00:00.000Z`)
    const dow = d.getUTCDay()
    for (const r of rows as any[]) {
      if (r.repeat_weekly === true) {
        const weekdays = Array.isArray(r.repeat_weekdays) ? (r.repeat_weekdays as number[]) : null
        if (weekdays && weekdays.length > 0 && !weekdays.includes(dow)) continue
      }
      if (typeof r.work_schedule_id === 'string' && r.work_schedule_id) {
        return { found: true, workScheduleId: r.work_schedule_id, source: 'assignment' }
      }
    }
  }

  if (typeof fallbackWorkScheduleId === 'string' && fallbackWorkScheduleId) {
    return { found: true, workScheduleId: fallbackWorkScheduleId, source: 'employee_default' }
  }

  return { found: false, workScheduleId: null, source: 'none' }
}

