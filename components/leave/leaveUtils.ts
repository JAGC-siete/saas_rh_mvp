import type { LeaveRequest, LeaveType } from '../../lib/types/leave'
import { parseLocalDateYmd, proposedDaysFromForm as proposedDaysFromFormCore } from '../../lib/leave/leave-request-validation'

export { parseLocalDateYmd }

export function attendanceDashboardHref(request: LeaveRequest): string {
  const employeeId = request.employee_id || request.employee?.id || ''
  const from = request.start_date.slice(0, 10)
  const to = request.end_date.slice(0, 10)
  const q = new URLSearchParams({
    preset: 'custom',
    employee_id: employeeId,
    from,
    to,
  })
  return `/app/attendance/dashboard?${q.toString()}`
}

export function summaryLabelEs(s: string): string {
  switch (s) {
    case 'presente':
      return 'Presente'
    case 'ausente':
      return 'Ausente'
    case 'permiso_pagado':
      return 'Permiso pagado'
    case 'sin_datos':
      return 'Sin datos'
    default:
      return s
  }
}

export function getLeaveTypeName(request: LeaveRequest, leaveTypes: LeaveType[]): string {
  if (request.leave_type?.name) return request.leave_type.name
  const leaveType = leaveTypes.find((lt) => lt.id === request.leave_type_id)
  return leaveType ? leaveType.name : 'Tipo no encontrado'
}

export function displayEmployeeName(request: LeaveRequest): string {
  return request.employee?.name?.trim() || '—'
}

export function displayEmployeeDni(request: LeaveRequest): string {
  return request.employee?.dni || request.employee_dni
}

export function formatDuration(request: LeaveRequest): string {
  if (request.duration_type === 'hours') {
    if (request.is_half_day) {
      return '4 horas (Medio día)'
    }
    return `${request.duration_hours || 8} horas`
  }
  return `${request.days_requested} días`
}

export function getStatusColorClass(status: string): string {
  switch (status) {
    case 'approved':
      return 'text-emerald-200 bg-emerald-500/15 border border-emerald-400/35'
    case 'rejected':
      return 'text-rose-200 bg-rose-500/15 border border-rose-400/35'
    case 'cancelled':
      return 'text-gray-200 bg-white/10 border border-white/20'
    default:
      return 'text-amber-100 bg-amber-500/15 border border-amber-400/35'
  }
}

export function statusLabelEs(status: string): string {
  if (status === 'pending') return 'Pendiente'
  if (status === 'approved') return 'Aprobado'
  if (status === 'cancelled') return 'Cancelada'
  return 'Rechazado'
}

/** Días decimales que aportaría una nueva solicitud (aprox. al backend). */
export function proposedDaysFromForm(input: {
  duration_type: 'hours' | 'days'
  start_date: string
  end_date: string
  duration_hours?: number
  is_half_day: boolean
}): number | null {
  return proposedDaysFromFormCore(input)
}

export function usedDaysByTypeForEmployee(
  requests: LeaveRequest[],
  employeeDni: string,
  employeeId: string | undefined,
  includePending: boolean
): Map<string, number> {
  const map = new Map<string, number>()
  for (const r of requests) {
    const match =
      (employeeId && r.employee_id === employeeId) ||
      (r.employee?.dni && r.employee.dni === employeeDni) ||
      r.employee_dni === employeeDni
    if (!match) continue
    if (r.status === 'approved' || (includePending && r.status === 'pending')) {
      const prev = map.get(r.leave_type_id) || 0
      map.set(r.leave_type_id, prev + (Number(r.days_requested) || 0))
    }
  }
  return map
}
