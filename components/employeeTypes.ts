export interface Employee {
  id: string
  company_id: string
  employee_code: string
  dni: string
  name: string
  email: string
  phone: string
  role: string
  position: string
  base_salary: number
  hire_date: string
  status: string
  bank_name: string
  bank_account: string
  department_id?: string
  attendance_status?: 'present' | 'absent' | 'late' | 'not_registered'
  check_in_time?: string
  check_out_time?: string
  work_schedule?: {
    start_time: string
    end_time: string
  }
  gamification?: {
    total_points: number
    weekly_points: number
    monthly_points: number
    achievements_count: number
  }
}

export interface Department {
  id: string
  name: string
}

export interface WorkSchedule {
  id: string
  name: string
}
