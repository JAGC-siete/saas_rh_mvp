import { UserProfile } from '../auth-helpers'
import { AttendanceExportInput, AttendanceTrendsInput } from './schema-validation'

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

    // Filtrar por role/equipo si se proporciona
    if (params.role) {
      // Obtener empleados con el role específico en la empresa del usuario
      const { data: roleEmployees, error: roleError } = await this.supabase
        .from('employees')
        .select('id')
        .eq('company_id', this.userProfile.company_id)
        .eq('role', params.role)
        .eq('status', 'active')

      if (roleError) {
        throw new Error(`Error obteniendo empleados del role: ${roleError.message}`)
      }

      const roleEmployeeIds = (roleEmployees || []).map((emp: any) => emp.id)
      
      if (roleEmployeeIds.length > 0) {
        query = query.in('employee_id', roleEmployeeIds)
      } else {
        // Si no hay empleados con ese role, devolver array vacío
        return []
      }
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Error obteniendo registros de asistencia: ${error.message}`)
    }

    return data || []
  }

  /**
   * Obtener tendencias de asistencia con filtros de seguridad
   */
  async getAttendanceTrends(params: AttendanceTrendsInput) {
    // Obtener empleados de la empresa del usuario
    const { data: employees, error: empError } = await this.supabase
      .from('employees')
      .select('id')
      .eq('company_id', this.userProfile.company_id)
      .eq('status', 'active')

    if (empError) {
      throw new Error(`Error obteniendo empleados: ${empError.message}`)
    }

    const employeeIds = (employees || []).map((emp: any) => emp.id)

    if (employeeIds.length === 0) {
      return []
    }

    // Construir query con parámetros seguros
    let query = this.supabase
      .from('attendance_records')
      .select(`
        date,
        status,
        check_in,
        check_out,
        late_minutes,
        employees!attendance_records_employee_id_fkey(
          name,
          employee_code,
          role
        )
      `)
      .gte('date', params.startDate)
      .lte('date', params.endDate)
      .in('employee_id', employeeIds)

    // Filtrar por empleado específico si se proporciona
    if (params.employee_id) {
      // Verificar que el empleado pertenece a la empresa del usuario
      const employeeExists = employeeIds.includes(params.employee_id)
      if (!employeeExists) {
        throw new Error('Empleado no encontrado o no autorizado')
      }

      query = query.eq('employee_id', params.employee_id)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Error obteniendo tendencias de asistencia: ${error.message}`)
    }

    return data || []
  }

  /**
   * Obtener estadísticas de asistencia con filtros de seguridad
   */
  async getAttendanceStats(params: AttendanceTrendsInput) {
    const records = await this.getAttendanceTrends(params)

    // Calcular estadísticas de forma segura
    const stats = {
      totalRecords: records.length,
      presentDays: records.filter((r: any) => r.status === 'present').length,
      absentDays: records.filter((r: any) => r.status === 'absent').length,
      lateDays: records.filter((r: any) => r.late_minutes > 0).length,
      averageLateMinutes: 0,
      totalHours: 0
    }

    if (records.length > 0) {
      const lateRecords = records.filter((r: any) => r.late_minutes > 0)
      stats.averageLateMinutes = lateRecords.length > 0 
        ? lateRecords.reduce((sum: number, r: any) => sum + r.late_minutes, 0) / lateRecords.length
        : 0

      // Calcular horas totales (simplificado)
      stats.totalHours = records.reduce((sum: number, r: any) => {
        if (r.check_in && r.check_out) {
          const checkIn = new Date(r.check_in)
          const checkOut = new Date(r.check_out)
          const hours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60)
          return sum + Math.max(0, hours)
        }
        return sum
      }, 0)
    }

    return stats
  }
}

/**
 * Factory function para crear query builder seguro
 */
export function createSecureQueryBuilder(supabase: any, userProfile: UserProfile) {
  return new SecureQueryBuilder(supabase, userProfile)
}
