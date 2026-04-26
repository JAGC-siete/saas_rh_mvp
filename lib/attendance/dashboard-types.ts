/** Tipos alineados con la respuesta de GET /api/attendance/employee/[id] */

export interface AttendanceEmployeeTimelineEvent {
  ts_local: string
  event_type: string
  source?: string
  justification?: string | null
}

export interface AttendanceEmployeeDepartment {
  id: string
  name: string
}

export interface AttendanceEmployeeWorkSchedule {
  id: string
  name: string
  monday_start?: string | null
  monday_end?: string | null
  tuesday_start?: string | null
  tuesday_end?: string | null
  wednesday_start?: string | null
  wednesday_end?: string | null
  thursday_start?: string | null
  thursday_end?: string | null
  friday_start?: string | null
  friday_end?: string | null
  saturday_start?: string | null
  saturday_end?: string | null
  sunday_start?: string | null
  sunday_end?: string | null
}

export interface AttendanceEmployeeDetail {
  id: string
  name: string
  employee_code?: string | null
  dni?: string | null
  role?: string | null
  team?: string | null
  department_id?: string | null
  work_schedule_id?: string | null
  departments?: AttendanceEmployeeDepartment | AttendanceEmployeeDepartment[] | null
  work_schedules?: AttendanceEmployeeWorkSchedule | null
}

export interface AttendanceEmployeeDrawerStats {
  attendanceAverage: string
  presentDays: number
  totalDays: number
}

export interface AttendanceEmployeeDrawerSchedule {
  expectedCheckIn: string | null
  scheduleName: string | null
}

export interface AttendanceRawPunchRow {
  id: string
  ts_utc: string
  device_id?: string | null
  event_uid?: string | null
  local_date?: string | null
}

export interface AttendanceEmployeeApiResponse {
  employee?: AttendanceEmployeeDetail
  timeline?: AttendanceEmployeeTimelineEvent[]
  raw_punches?: AttendanceRawPunchRow[]
  stats?: AttendanceEmployeeDrawerStats
  schedule?: AttendanceEmployeeDrawerSchedule
  error?: string
}
