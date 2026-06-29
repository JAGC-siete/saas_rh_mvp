import { createAdminClient } from '../supabase/server'

export interface FetchAttendanceReportOptions {
  employeeId?: string
  departmentId?: string
  employeeIds?: string[]
}

/**
 * Carga registros de asistencia para exportación (post-auth).
 * Usa service role acotado por companyId del perfil validado en el handler.
 */
export async function fetchAttendanceReportDataForExport(
  companyId: string,
  startDate: string,
  endDate: string,
  options: FetchAttendanceReportOptions = {}
) {
  const admin = createAdminClient()

  let employeesQuery = admin
    .from('employees')
    .select('id, name, employee_code')
    .eq('company_id', companyId)
    .eq('status', 'active')

  if (options.departmentId) {
    employeesQuery = employeesQuery.eq('department_id', options.departmentId)
  }

  const { data: employees, error: empError } = await employeesQuery
  if (empError) {
    throw new Error(`Error obteniendo empleados: ${empError.message}`)
  }

  let employeeIds = (employees || []).map((e) => e.id)

  if (options.employeeIds && options.employeeIds.length > 0) {
    const allow = new Set(options.employeeIds)
    employeeIds = employeeIds.filter((id) => allow.has(id))
  }

  if (options.employeeId) {
    if (!employeeIds.includes(options.employeeId)) {
      return { employees: employees || [], attendance: [] as any[] }
    }
    employeeIds = [options.employeeId]
  }

  let attendanceQuery = admin
    .from('attendance_records')
    .select(`
      *,
      employees!attendance_records_employee_id_fkey(
        name,
        employee_code,
        role,
        company_id,
        departments!employees_department_id_fkey(name)
      )
    `)
    .gte('date', startDate)
    .lte('date', endDate)

  if (employeeIds.length > 0) {
    attendanceQuery = attendanceQuery.in('employee_id', employeeIds)
  } else {
    attendanceQuery = attendanceQuery.eq('employee_id', '__none__')
  }

  const { data: attendance, error: attError } = await attendanceQuery
  if (attError) {
    throw new Error(`Error obteniendo asistencia: ${attError.message}`)
  }

  return { employees: employees || [], attendance: attendance || [] }
}
