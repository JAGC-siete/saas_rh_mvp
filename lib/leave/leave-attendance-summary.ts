import type { SupabaseClient } from '@supabase/supabase-js'

export function enumerateCalendarDays(fromStr: string, toStr: string): string[] {
  const from = fromStr.slice(0, 10)
  const to = toStr.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) {
    return []
  }
  const out: string[] = []
  let cur = from
  while (cur <= to && out.length <= 366) {
    out.push(cur)
    const [y, m, d] = cur.split('-').map(Number)
    const next = new Date(Date.UTC(y, m - 1, d + 1))
    cur = next.toISOString().slice(0, 10)
  }
  return out
}

export type LeaveAttendanceSummaryDay = {
  date: string
  summary: 'sin_datos' | 'presente' | 'ausente' | 'permiso_pagado'
  has_check_in: boolean
  record_status: string | null
}

export type LeaveAttendanceSummaryPayload = {
  days: LeaveAttendanceSummaryDay[]
  employee_id: string
  leave_request_id: string
}

/** Construye el resumen a partir de rango ya validado por el llamador (RRHH o empleado). */
export async function fetchLeaveAttendanceSummaryForRange(
  supabase: SupabaseClient,
  params: {
    leave_request_id: string
    employee_id: string
    start_date: string
    end_date: string
    leave_status?: string
    leave_is_paid?: boolean
  }
): Promise<{ ok: true; data: LeaveAttendanceSummaryPayload } | { ok: false; status: number; error: string }> {
  const from = params.start_date.slice(0, 10)
  const to = params.end_date.slice(0, 10)
  const daysList = enumerateCalendarDays(from, to)

  if (daysList.length === 0) {
    return {
      ok: true,
      data: {
        days: [],
        employee_id: params.employee_id,
        leave_request_id: params.leave_request_id,
      },
    }
  }

  const { data: timelineRaw, error: timelineError } = await supabase.rpc('attendance_employee_timeline', {
    p_employee_id: params.employee_id,
    p_from: from,
    p_to: to,
  })

  if (timelineError) {
    return { ok: false, status: 500, error: timelineError.message }
  }

  const byDate = new Map<string, { check_in: string | null; status: string | null }>()
  for (const row of timelineRaw || []) {
    const key = typeof row.date === 'string' ? row.date.slice(0, 10) : String(row.date).slice(0, 10)
    byDate.set(key, { check_in: row.check_in ?? null, status: row.status ?? null })
  }

  const isApprovedPaidLeave =
    params.leave_status === 'approved' && params.leave_is_paid !== false

  const days: LeaveAttendanceSummaryDay[] = daysList.map((date) => {
    const row = byDate.get(date)
    if (!row) {
      if (isApprovedPaidLeave && date >= from && date <= to) {
        return {
          date,
          summary: 'permiso_pagado' as const,
          has_check_in: false,
          record_status: 'paid_leave',
        }
      }
      return {
        date,
        summary: 'sin_datos' as const,
        has_check_in: false,
        record_status: null as string | null,
      }
    }
    const has_check_in = !!row.check_in
    const st = (row.status || '').toLowerCase()
    let summary: 'sin_datos' | 'presente' | 'ausente' | 'permiso_pagado'
    if (has_check_in) {
      summary = 'presente'
    } else if (isApprovedPaidLeave) {
      summary = 'permiso_pagado'
    } else if (st === 'absent') {
      summary = 'ausente'
    } else {
      summary = 'ausente'
    }
    return {
      date,
      summary,
      has_check_in,
      record_status: row.status,
    }
  })

  return {
    ok: true,
    data: {
      days,
      employee_id: params.employee_id,
      leave_request_id: params.leave_request_id,
    },
  }
}

/**
 * Carga la solicitud y valida propiedad del empleado si se pasa requireEmployeeId.
 */
export async function fetchLeaveAttendanceSummaryForRequest(
  supabase: SupabaseClient,
  leaveRequestId: string,
  requireEmployeeId?: string
): Promise<{ ok: true; data: LeaveAttendanceSummaryPayload } | { ok: false; status: number; error: string }> {
  const { data: currentRequest, error: fetchError } = await supabase
    .from('leave_requests')
    .select(`
      id,
      employee_id,
      start_date,
      end_date,
      status,
      leave_type:leave_types(is_paid)
    `)
    .eq('id', leaveRequestId)
    .single()

  if (fetchError || !currentRequest) {
    return { ok: false, status: 404, error: 'Leave request not found' }
  }

  if (requireEmployeeId && currentRequest.employee_id !== requireEmployeeId) {
    return { ok: false, status: 403, error: 'Access denied' }
  }

  if (!currentRequest.employee_id) {
    return { ok: false, status: 400, error: 'Solicitud sin empleado asignado' }
  }

  return fetchLeaveAttendanceSummaryForRange(supabase, {
    leave_request_id: leaveRequestId,
    employee_id: currentRequest.employee_id,
    start_date: currentRequest.start_date,
    end_date: currentRequest.end_date,
    leave_status: currentRequest.status,
    leave_is_paid: (currentRequest as { leave_type?: { is_paid?: boolean } }).leave_type?.is_paid,
  })
}
