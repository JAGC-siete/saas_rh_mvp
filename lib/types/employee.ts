export interface Employee {
  id: string
  company_id: string
  employee_code: string | null
  dni: string
  name: string
  email: string | null
  phone: string | null
  role: string | null
  team: string | null
  base_salary: number
  hire_date: string | null
  termination_date: string | null
  status: 'active' | 'inactive'
  bank_name: string | null
  bank_account: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  address: string | Record<string, any> | null
  metadata: Record<string, any> | null
  department_id: string | null
  work_schedule_id: string | null
  employee_pin_hash: string | null
  profile_image_path: string | null
  profile_image_meta: Record<string, any> | null
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