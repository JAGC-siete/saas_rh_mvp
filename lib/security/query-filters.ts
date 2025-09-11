/**
 * Filtros de consulta seguros para prevenir acceso no autorizado a datos
 * Aplica filtros de empresa y permisos automáticamente
 */

import { NextApiRequest, NextApiResponse } from 'next'
import { UserProfile } from '../auth-helpers'
// import { ROLES } from './permissions' // No se usa actualmente

export interface QueryFilterOptions {
  userProfile: UserProfile
  table: string
  enforceCompanyFilter?: boolean
  enforcePermissionFilter?: boolean
  additionalFilters?: Record<string, any>
}

/**
 * Aplica filtros de empresa a una consulta
 */
export function applyCompanyFilter(query: any, userProfile: UserProfile): any {
  // Super admin puede ver todas las empresas
  if (userProfile.role === 'super_admin') {
    return query
  }
  
  // Aplicar filtro de empresa si el usuario tiene company_id
  if (userProfile.company_id) {
    return query.eq('company_id', userProfile.company_id)
  }
  
  // Si no tiene company_id, forzar resultado vacío
  return query.eq('company_id', '__none__')
}

/**
 * Aplica filtros de permisos a una consulta
 */
export function applyPermissionFilter(
  query: any, 
  userProfile: UserProfile, 
  table: string
): any {
  // Super admin no tiene restricciones
  if (userProfile.role === 'super_admin') {
    return query
  }
  
  // Aplicar filtros específicos por tabla y rol
  switch (table) {
    case 'attendance_records':
      return applyAttendancePermissionFilter(query, userProfile)
    
    case 'employees':
      return applyEmployeePermissionFilter(query, userProfile)
    
    case 'payroll_records':
      return applyPayrollPermissionFilter(query, userProfile)
    
    case 'user_profiles':
      return applyUserProfilePermissionFilter(query, userProfile)
    
    case 'companies':
      return applyCompanyPermissionFilter(query, userProfile)
    
    default:
      // Por defecto, aplicar filtro de empresa
      return applyCompanyFilter(query, userProfile)
  }
}

/**
 * Filtros específicos para attendance_records
 */
function applyAttendancePermissionFilter(query: any, userProfile: UserProfile): any {
  // Si es empleado, solo puede ver sus propios registros
  if (userProfile.role === 'employee') {
    return query.eq('employee_id', userProfile.id)
  }
  
  // Otros roles pueden ver todos los registros de su empresa
  return applyCompanyFilter(query, userProfile)
}

/**
 * Filtros específicos para employees
 */
function applyEmployeePermissionFilter(query: any, userProfile: UserProfile): any {
  // Si es empleado, solo puede ver su propio perfil
  if (userProfile.role === 'employee') {
    return query.eq('id', userProfile.id)
  }
  
  // Otros roles pueden ver empleados de su empresa
  return applyCompanyFilter(query, userProfile)
}

/**
 * Filtros específicos para payroll_records
 */
function applyPayrollPermissionFilter(query: any, userProfile: UserProfile): any {
  // Solo roles con permisos de nómina pueden ver registros de nómina
  const payrollRoles = ['super_admin', 'company_admin', 'hr_manager', 'hr_analyst']
  
  if (!payrollRoles.includes(userProfile.role)) {
    // Si no tiene permisos de nómina, forzar resultado vacío
    return query.eq('id', '__none__')
  }
  
  // Aplicar filtro de empresa
  return applyCompanyFilter(query, userProfile)
}

/**
 * Filtros específicos para user_profiles
 */
function applyUserProfilePermissionFilter(query: any, userProfile: UserProfile): any {
  // Solo super admin puede ver todos los perfiles
  if (userProfile.role === 'super_admin') {
    return query
  }
  
  // Otros roles solo pueden ver perfiles de su empresa
  return applyCompanyFilter(query, userProfile)
}

/**
 * Filtros específicos para companies
 */
function applyCompanyPermissionFilter(query: any, userProfile: UserProfile): any {
  // Solo super admin puede ver todas las empresas
  if (userProfile.role === 'super_admin') {
    return query
  }
  
  // Otros roles solo pueden ver su propia empresa
  if (userProfile.company_id) {
    return query.eq('id', userProfile.company_id)
  }
  
  // Si no tiene company_id, forzar resultado vacío
  return query.eq('id', '__none__')
}

/**
 * Crea un filtro de consulta seguro completo
 */
export function createSecureQueryFilter(options: QueryFilterOptions): any {
  const { userProfile, table, enforceCompanyFilter = true, enforcePermissionFilter = true, additionalFilters = {} } = options
  
  // Crear función que aplicará los filtros
  return (query: any) => {
    let filteredQuery = query
    
    // Aplicar filtros de empresa
    if (enforceCompanyFilter) {
      filteredQuery = applyCompanyFilter(filteredQuery, userProfile)
    }
    
    // Aplicar filtros de permisos
    if (enforcePermissionFilter) {
      filteredQuery = applyPermissionFilter(filteredQuery, userProfile, table)
    }
    
    // Aplicar filtros adicionales
    Object.entries(additionalFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        filteredQuery = filteredQuery.eq(key, value)
      }
    })
    
    return filteredQuery
  }
}

/**
 * Valida si un usuario puede acceder a un recurso específico
 */
 
export function canAccessResource(
  userProfile: UserProfile,
  resourceType: string,
  _resourceId?: string
): boolean {
  // Super admin puede acceder a todo
  if (userProfile.role === 'super_admin') {
    return true
  }
  
  // Validar acceso por tipo de recurso
  switch (resourceType) {
    case 'attendance':
      return ['company_admin', 'hr_manager', 'hr_analyst', 'department_manager', 'employee'].includes(userProfile.role)
    
    case 'payroll':
      return ['company_admin', 'hr_manager', 'hr_analyst'].includes(userProfile.role)
    
    case 'employees':
      return ['company_admin', 'hr_manager', 'hr_analyst', 'department_manager'].includes(userProfile.role)
    
    case 'reports':
      return ['company_admin', 'hr_manager', 'hr_analyst', 'department_manager'].includes(userProfile.role)
    
    case 'admin':
      return ['super_admin', 'company_admin'].includes(userProfile.role)
    
    default:
      return false
  }
}

/**
 * Obtiene el nivel de acceso de un usuario para una tabla
 */
export function getAccessLevel(userProfile: UserProfile, table: string): 'none' | 'own' | 'company' | 'all' {
  // Super admin tiene acceso completo
  if (userProfile.role === 'super_admin') {
    return 'all'
  }
  
  // Determinar nivel de acceso por tabla
  switch (table) {
    case 'attendance_records':
      if (userProfile.role === 'employee') return 'own'
      return 'company'
    
    case 'employees':
      if (userProfile.role === 'employee') return 'own'
      return 'company'
    
    case 'payroll_records':
      const payrollRoles = ['company_admin', 'hr_manager', 'hr_analyst']
      return payrollRoles.includes(userProfile.role) ? 'company' : 'none'
    
    case 'user_profiles':
      return 'company'
    
    case 'companies':
      return userProfile.role === 'company_admin' ? 'own' : 'none'
    
    default:
      return 'company'
  }
}

/**
 * Aplica filtros de fecha seguros
 */
export function applyDateFilter(
  query: any,
  startDate: string,
  endDate: string,
  dateColumn: string = 'date'
): any {
  return query
    .gte(dateColumn, startDate)
    .lte(dateColumn, endDate)
}

/**
 * Aplica filtros de empleado seguros
 */
export function applyEmployeeFilter(
  query: any,
  userProfile: UserProfile,
  employeeId?: string
): any {
  // Si se especifica un empleado específico
  if (employeeId) {
    // Verificar que el usuario puede acceder a ese empleado
    if (userProfile.role === 'employee' && employeeId !== userProfile.id) {
      // Empleado solo puede ver sus propios datos
      return query.eq('employee_id', '__none__')
    }
    
    return query.eq('employee_id', employeeId)
  }
  
  // Si no se especifica empleado, aplicar filtros por rol
  if (userProfile.role === 'employee') {
    return query.eq('employee_id', userProfile.id)
  }
  
  // Otros roles pueden ver todos los empleados de su empresa
  return query
}

/**
 * Middleware para aplicar filtros automáticamente
 */
export function withSecureFilters(
  table: string,
  options: Partial<QueryFilterOptions> = {}
) {
  return (req: NextApiRequest, res: NextApiResponse, next: () => void) => {
    const userProfile = (req as any).userProfile
    
    if (!userProfile) {
      return res.status(401).json({
        error: 'No autorizado',
        message: 'Perfil de usuario no encontrado'
      })
    }
    
    // Crear filtro seguro
    const secureFilter = createSecureQueryFilter({
      userProfile,
      table,
      ...options
    })
    
    // Agregar filtro al request
    ;(req as any).secureFilter = secureFilter
    
    next()
  }
}
