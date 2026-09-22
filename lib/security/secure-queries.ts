import { UserProfile } from '../auth-helpers'
import { AttendanceExportInput } from './schema-validation'

/**
 * QUERY BUILDER SEGURO CONTRA SQLi
 * Usa prepared statements y RLS para prevenir inyección SQL
 */

export class SecureQueryBuilder {
  private supabase: any
  private userProfile: UserProfile

  constructor(supabase: any, userProfile: UserProfile) {
    this.supabase = supabase
    this.userProfile = userProfile
  }

  /**
   * Obtener registros de asistencia con filtros de seguridad
   */
  async getAttendanceRecords(params: AttendanceExportInput) {
    // PRIMERO: Obtener employee_ids de la empresa del usuario
    let employeeIds: string[] = []
    if (this.userProfile.company_id) {
      const { data: employees, error: empError } = await this.supabase
        .from('employees')
        .select('id')
        .eq('company_id', this.userProfile.company_id)
        .eq('status', 'active')
      
      if (empError) {
        console.error('❌ Error fetching employees for company:', empError)
        throw new Error(`Error obteniendo empleados: ${empError.message}`)
      }
      
      employeeIds = employees?.map((emp: any) => emp.id) || []
      console.log('👥 Employees for company:', { count: employeeIds.length, companyId: this.userProfile.company_id })
    }

    // SEGUNDO: Construir query con parámetros seguros
    let query = this.supabase
      .from('attendance_records')
      .select(`
        *,
        employees!attendance_records_employee_id_fkey(
          name,
          employee_code,
          role,
          company_id,
          department_id
        )
      `)
      .gte('date', params.startDate)
      .lte('date', params.endDate)

    // Filtrar por employee_ids de la empresa
    if (employeeIds.length > 0) {
      query = query.in('employee_id', employeeIds)
    } else {
      // Si no hay empleados, devolver array vacío
      console.log('⚠️ No employees found for company, returning empty array')
      return []
    }

    // Filtrar por empleado específico si se proporciona
    if (params.employee_id) {
      // Verificar que el empleado pertenece a la empresa del usuario
      const { data: employee, error: empError } = await this.supabase
        .from('employees')
        .select('id, company_id')
        .eq('id', params.employee_id)
        .eq('company_id', this.userProfile.company_id)
        .single()

      if (empError || !employee) {
        throw new Error('Empleado no encontrado o no autorizado')
      }

      query = query.eq('employee_id', params.employee_id)
    }

    // Filtrar por role y/o departamento (intersectar si ambos)
    let filteredIds: string[] | null = null
    if (params.role) {
      const { data: roleEmployees, error: roleError } = await this.supabase
        .from('employees')
        .select('id')
        .eq('company_id', this.userProfile.company_id)
        .eq('role', params.role)
        .eq('status', 'active')

      if (roleError) throw new Error(`Error obteniendo empleados del role: ${roleError.message}`)
      const ids = (roleEmployees || []).map((emp: any) => emp.id)
      filteredIds = filteredIds ? ids.filter((id: string) => filteredIds!.includes(id)) : ids
      if ((filteredIds?.length ?? 0) === 0) return []
    }
    if (params.department_id) {
      const { data: deptEmployees, error: deptError } = await this.supabase
        .from('employees')
        .select('id')
        .eq('company_id', this.userProfile.company_id)
        .eq('department_id', params.department_id)
        .eq('status', 'active')

      if (deptError) throw new Error(`Error obteniendo empleados del departamento: ${deptError.message}`)
      const ids = (deptEmployees || []).map((emp: any) => emp.id)
      filteredIds = filteredIds ? ids.filter((id: string) => filteredIds!.includes(id)) : ids
      if ((filteredIds?.length ?? 0) === 0) return []
    }
    if (filteredIds && filteredIds.length > 0) {
      query = query.in('employee_id', filteredIds)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Error obteniendo registros de asistencia: ${error.message}`)
    }

    return data || []
  }
}

/**
 * Factory function para crear query builder seguro
 */
export function createSecureQueryBuilder(supabase: any, userProfile: UserProfile) {
  return new SecureQueryBuilder(supabase, userProfile)
}
