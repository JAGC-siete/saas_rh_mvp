export interface Employee {
  id: string
  company_id: string
  employee_code: string
  dni: string
  name: string
  email: string
  phone: string
  role: string
  team: string
  position: string
  base_salary: number
  hire_date: string
  termination_date: string
  status: string
  bank_name: string
  bank_account: string
  emergency_contact_name: string
  emergency_contact_phone: string
  address: string
  metadata: string
  department_id: string
  work_schedule_id: string
  created_at: string
  updated_at: string
  
  // API processed fields
  attendance_status?: 'present' | 'absent' | 'late' | 'not_registered'
  check_in_time?: string
  check_out_time?: string
  
  // Related data from joins
  departments?: { name: string }
  work_schedules?: { 
    name: string
    monday_start?: string
    monday_end?: string
  }
  employee_scores?: {
    total_points?: number
    weekly_points?: number
    monthly_points?: number
  }
  attendance_records?: Array<{
    check_in?: string
    check_out?: string
    status?: string
  }>
} 