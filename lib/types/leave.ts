export interface LeaveType {
  id: string
  company_id?: string
  name: string
  max_days_per_year?: number
  is_paid: boolean
  requires_approval: boolean
  color: string
  created_at: string
  employee_self_service?: boolean
  is_statutory_art95?: boolean
}

/** Empleado tal como viene del join en GET /api/leave */
export interface LeaveRequestEmployeeJoin {
  id: string
  name: string
  email: string | null
  dni: string
  company_id: string | null
}

export interface LeaveRequest {
  id: string
  employee_id: string
  leave_type_id: string
  employee_dni: string
  start_date: string
  end_date: string
  days_requested: number
  duration_hours?: number
  duration_type: 'hours' | 'days'
  is_half_day?: boolean
  reason?: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  approved_by?: string
  approved_at?: string
  rejection_reason?: string
  attachment_url?: string
  attachment_type?: 'pdf' | 'jpg'
  attachment_name?: string
  created_at: string
  updated_at: string

  employee?: LeaveRequestEmployeeJoin
  leave_type?: LeaveType
}

/** Solicitud enriquecida desde API (joins employee + leave_type). */
export type LeaveRequestWithRelations = LeaveRequest

export interface CreateLeaveRequestData {
  employee_dni: string
  leave_type_id: string
  start_date: string
  end_date: string
  duration_type: 'hours' | 'days'
  duration_hours?: number
  is_half_day?: boolean
  reason?: string
  attachment?: File
}

export interface UpdateLeaveRequestData {
  status: 'approved' | 'rejected'
  rejection_reason?: string
}

/** Resumen diario de asistencia en el rango de un permiso (GET /api/leave/[id]?attendance_summary=1) */
export interface LeaveAttendanceDaySummary {
  date: string
  summary: 'sin_datos' | 'presente' | 'ausente'
  has_check_in: boolean
  record_status: string | null
}

export interface LeaveAttendanceSummaryPayload {
  days: LeaveAttendanceDaySummary[]
  employee_id: string
  leave_request_id: string
}

/** Fila mínima de /api/employees para el formulario de permisos */
export interface LeaveFormEmployeeOption {
  id: string
  name: string
  dni: string
  email: string | null
  company_id: string | null
  status?: string | null
  /** Si viene de GET /api/employees (fila employees.*) */
  department_id?: string | null
}
