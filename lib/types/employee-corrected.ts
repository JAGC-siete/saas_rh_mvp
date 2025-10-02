// Generated types from database schema
import { Database } from '../database.types'

// Extract the employees table type from generated database types
type EmployeesTable = Database['public']['Tables']['employees']
type EmployeeRow = EmployeesTable['Row']
type EmployeeInsert = EmployeesTable['Insert']
type EmployeeUpdate = EmployeesTable['Update']

// Enhanced Employee interface that matches the database schema exactly
export interface EmployeeCorrected extends Omit<EmployeeRow, 'created_at' | 'updated_at'> {
  // Override timestamps to be required strings for API compatibility
  created_at: string
  updated_at: string
  
  // API processed fields (not in database)
  attendance_status?: 'present' | 'absent' | 'late' | 'not_registered'
  check_in_time?: string
  check_out_time?: string
  
  // Related data from joins (not in database)
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

// Type for creating new employees
export type EmployeeCreate = EmployeeInsert

// Type for updating employees
export type EmployeeUpdateData = EmployeeUpdate

// Helper type for form data (all fields as strings for form handling)
export interface EmployeeFormData {
  employee_code: string
  dni: string
  name: string
  email: string
  phone: string
  role: string
  team: string
  department_id: string
  work_schedule_id: string
  base_salary: string
  hire_date: string
  termination_date: string
  status: string
  bank_name: string
  bank_account: string
  emergency_contact_name: string
  emergency_contact_phone: string
  address: string
  metadata: string
}

// Helper function to convert form data to database format
export function formDataToEmployee(data: EmployeeFormData, companyId: string): EmployeeInsert {
  return {
    company_id: companyId,
    employee_code: data.employee_code || null,
    dni: data.dni,
    name: data.name,
    email: data.email || null,
    phone: data.phone || null,
    role: data.role || null,
    team: data.team || null,
    department_id: data.department_id || null,
    work_schedule_id: data.work_schedule_id || null,
    base_salary: parseFloat(data.base_salary) || 0,
    hire_date: data.hire_date || null,
    termination_date: data.termination_date || null,
    status: data.status || 'active',
    bank_name: data.bank_name || null,
    bank_account: data.bank_account || null,
    emergency_contact_name: data.emergency_contact_name || null,
    emergency_contact_phone: data.emergency_contact_phone || null,
    address: data.address ? JSON.parse(data.address) : null,
    metadata: data.metadata ? JSON.parse(data.metadata) : null,
  }
}

// Helper function to convert database row to form data
export function employeeToFormData(employee: EmployeeRow): EmployeeFormData {
  return {
    employee_code: employee.employee_code || '',
    dni: employee.dni,
    name: employee.name,
    email: employee.email || '',
    phone: employee.phone || '',
    role: employee.role || '',
    team: employee.team || '',
    department_id: employee.department_id || '',
    work_schedule_id: employee.work_schedule_id || '',
    base_salary: employee.base_salary.toString(),
    hire_date: employee.hire_date || '',
    termination_date: employee.termination_date || '',
    status: employee.status || 'active',
    bank_name: employee.bank_name || '',
    bank_account: employee.bank_account || '',
    emergency_contact_name: employee.emergency_contact_name || '',
    emergency_contact_phone: employee.emergency_contact_phone || '',
    address: typeof employee.address === 'string' ? employee.address : JSON.stringify(employee.address || {}),
    metadata: typeof employee.metadata === 'string' ? employee.metadata : JSON.stringify(employee.metadata || {}),
  }
}
