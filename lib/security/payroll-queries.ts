import { UserProfile } from '../auth-helpers'
import { PayrollExportInput } from './payroll-validation'

/**
 * QUERY BUILDER SEGURO PARA PAYROLL
 * Previene acceso no autorizado a datos de otras empresas
 */

export class SecurePayrollQueryBuilder {
  private supabase: any
  private userProfile: UserProfile

  constructor(supabase: any, userProfile: UserProfile) {
    this.supabase = supabase
    this.userProfile = userProfile
  }

  /**
   * Obtener registros de payroll con filtros de seguridad estrictos
   */
  async getPayrollRecords(params: PayrollExportInput) {
    // Validar acceso a empresa
    if (params.company_id && params.company_id !== this.userProfile.company_id) {
      throw new Error('No autorizado para acceder a datos de esta empresa')
    }

    // Construir query con parámetros seguros
    let query = this.supabase
      .from('payroll_records')
      .select(`
        *,
        employees!payroll_records_employee_id_fkey(
          name,
          employee_code,
          position,
          department,
          bank_name,
          bank_account,
          company_id
        )
      `)
      .gte('period_start', `${params.periodo}-01`)
      .lt('period_start', `${params.periodo}-32`)

    // FILTRO OBLIGATORIO: Solo empleados de la empresa del usuario
    query = query.eq('employees.company_id', this.userProfile.company_id)

    // Ordenar por fecha de inicio del período
    query = query.order('period_start', { ascending: false })

    const { data, error } = await query

    if (error) {
      throw new Error(`Error obteniendo registros de payroll: ${error.message}`)
    }

    return data || []
  }

  /**
   * Verificar que el usuario tenga acceso a la empresa
   */
  async validateCompanyAccess(companyId: string): Promise<boolean> {
    if (!companyId) {
      return true
    }

    // Verificar que la empresa existe y el usuario tiene acceso
    const { data: company, error } = await this.supabase
      .from('companies')
      .select('id')
      .eq('id', companyId)
      .eq('id', this.userProfile.company_id) // Doble verificación
      .single()

    if (error || !company) {
      return false
    }

    return true
  }

  /**
   * Obtener estadísticas de payroll con filtros de seguridad
   */
  async getPayrollStats(params: PayrollExportInput) {
    const records = await this.getPayrollRecords(params)

    if (records.length === 0) {
      return {
        totalRecords: 0,
        totalGross: 0,
        totalDeductions: 0,
        totalNet: 0,
        averageNet: 0
      }
    }

    const stats = {
      totalRecords: records.length,
      totalGross: records.reduce((sum: number, r: any) => sum + (r.gross_salary || 0), 0),
      totalDeductions: records.reduce((sum: number, r: any) => sum + (r.total_deductions || 0), 0),
      totalNet: records.reduce((sum: number, r: any) => sum + (r.net_salary || 0), 0),
      averageNet: 0
    }

    stats.averageNet = stats.totalNet / stats.totalRecords

    return stats
  }

  /**
   * Obtener registros por departamento con filtros de seguridad
   */
  async getPayrollByDepartment(params: PayrollExportInput) {
    const records = await this.getPayrollRecords(params)

    const deptData: { [key: string]: any } = {}
    
    records.forEach((record: any) => {
      const dept = record.employees?.department || 'Sin Departamento'
      if (!deptData[dept]) {
        deptData[dept] = {
          empleados: 0,
          totalBruto: 0,
          totalDeducciones: 0,
          totalNeto: 0
        }
      }
      deptData[dept].empleados++
      deptData[dept].totalBruto += record.gross_salary || 0
      deptData[dept].totalDeducciones += record.total_deductions || 0
      deptData[dept].totalNeto += record.net_salary || 0
    })

    return Object.entries(deptData).map(([dept, data]: [string, any]) => ({
      departamento: dept,
      empleados: data.empleados,
      totalBruto: data.totalBruto,
      totalDeducciones: data.totalDeducciones,
      totalNeto: data.totalNeto,
      promedioNeto: data.totalNeto / data.empleados
    }))
  }
}

/**
 * Factory function para crear query builder seguro
 */
export function createSecurePayrollQueryBuilder(supabase: any, userProfile: UserProfile) {
  return new SecurePayrollQueryBuilder(supabase, userProfile)
}
