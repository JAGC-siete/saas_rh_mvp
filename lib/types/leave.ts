export interface LeaveType {
  id: string
  company_id?: string
  name: string
  max_days_per_year?: number
  is_paid: boolean
  requires_approval: boolean
  color: string
  created_at: string
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
  status: 'pending' | 'approved' | 'rejected'
  approved_by?: string
  approved_at?: string
  rejection_reason?: string
  attachment_url?: string
  attachment_type?: 'pdf' | 'jpg'
  attachment_name?: string
  created_at: string
  updated_at: string
  
  // Related data (populated by joins)
  employee?: {
    id: string
    first_name: string
    last_name: string
    email: string
    dni?: string
    company_id: string
  }
  leave_type?: LeaveType
}

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

export interface Employee {
  id: string
  first_name: string
  last_name: string
  email: string
  dni: string
  company_id: string
  status: string
}
