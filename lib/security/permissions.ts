/**
 * Sistema de permisos granular para autenticación y autorización
 * Define roles, permisos y validaciones de seguridad
 */

export interface Permission {
  id: string
  name: string
  description: string
  category: 'attendance' | 'payroll' | 'employees' | 'reports' | 'admin' | 'system'
  level: 'read' | 'write' | 'admin'
}

export interface Role {
  id: string
  name: string
  description: string
  permissions: string[]
  level: number // 1 = más restrictivo, 10 = más permisivo
}

// ===== DEFINICIÓN DE PERMISOS =====
export const PERMISSIONS: Record<string, Permission> = {
  // ATTENDANCE
  'can_view_attendance': {
    id: 'can_view_attendance',
    name: 'Ver Asistencia',
    description: 'Puede ver registros de asistencia',
    category: 'attendance',
    level: 'read'
  },
  'can_manage_attendance': {
    id: 'can_manage_attendance',
    name: 'Gestionar Asistencia',
    description: 'Puede crear, editar y eliminar registros de asistencia',
    category: 'attendance',
    level: 'write'
  },
  'can_register_attendance': {
    id: 'can_register_attendance',
    name: 'Registrar Asistencia',
    description: 'Puede registrar su propia asistencia',
    category: 'attendance',
    level: 'write'
  },
  'can_view_own_attendance': {
    id: 'can_view_own_attendance',
    name: 'Ver Propia Asistencia',
    description: 'Puede ver sus propios registros de asistencia',
    category: 'attendance',
    level: 'read'
  },

  // PAYROLL
  'can_view_payroll': {
    id: 'can_view_payroll',
    name: 'Ver Nómina',
    description: 'Puede ver información de nómina',
    category: 'payroll',
    level: 'read'
  },
  'can_generate_payroll': {
    id: 'can_generate_payroll',
    name: 'Generar Nómina',
    description: 'Puede generar cálculos de nómina',
    category: 'payroll',
    level: 'write'
  },
  'can_export_payroll': {
    id: 'can_export_payroll',
    name: 'Exportar Nómina',
    description: 'Puede exportar reportes de nómina',
    category: 'payroll',
    level: 'write'
  },
  'can_authorize_payroll': {
    id: 'can_authorize_payroll',
    name: 'Autorizar Nómina',
    description: 'Puede autorizar pagos de nómina',
    category: 'payroll',
    level: 'admin'
  },

  // EMPLOYEES
  'can_view_employees': {
    id: 'can_view_employees',
    name: 'Ver Empleados',
    description: 'Puede ver información de empleados',
    category: 'employees',
    level: 'read'
  },
  'can_manage_employees': {
    id: 'can_manage_employees',
    name: 'Gestionar Empleados',
    description: 'Puede crear, editar y eliminar empleados',
    category: 'employees',
    level: 'write'
  },
  'can_view_own_profile': {
    id: 'can_view_own_profile',
    name: 'Ver Perfil Propio',
    description: 'Puede ver su propio perfil de empleado',
    category: 'employees',
    level: 'read'
  },

  // REPORTS
  'can_view_reports': {
    id: 'can_view_reports',
    name: 'Ver Reportes',
    description: 'Puede ver reportes y análisis',
    category: 'reports',
    level: 'read'
  },
  'can_export_reports': {
    id: 'can_export_reports',
    name: 'Exportar Reportes',
    description: 'Puede exportar reportes en diferentes formatos',
    category: 'reports',
    level: 'write'
  },

  // ADMIN
  'can_manage_departments': {
    id: 'can_manage_departments',
    name: 'Gestionar Departamentos',
    description: 'Puede crear, editar y eliminar departamentos',
    category: 'admin',
    level: 'write'
  },
  'can_manage_companies': {
    id: 'can_manage_companies',
    name: 'Gestionar Empresas',
    description: 'Puede crear, editar y eliminar empresas',
    category: 'admin',
    level: 'admin'
  },
  'can_manage_users': {
    id: 'can_manage_users',
    name: 'Gestionar Usuarios',
    description: 'Puede crear, editar y eliminar usuarios',
    category: 'admin',
    level: 'admin'
  },

  // SYSTEM
  'can_view_system_logs': {
    id: 'can_view_system_logs',
    name: 'Ver Logs del Sistema',
    description: 'Puede ver logs y auditoría del sistema',
    category: 'system',
    level: 'read'
  },
  'can_manage_system_settings': {
    id: 'can_manage_system_settings',
    name: 'Gestionar Configuración',
    description: 'Puede modificar configuración del sistema',
    category: 'system',
    level: 'admin'
  }
}

// ===== DEFINICIÓN DE ROLES =====
export const ROLES: Record<string, Role> = {
  'super_admin': {
    id: 'super_admin',
    name: 'Super Administrador',
    description: 'Acceso completo al sistema',
    permissions: Object.keys(PERMISSIONS), // Todos los permisos
    level: 10
  },
  'company_admin': {
    id: 'company_admin',
    name: 'Administrador de Empresa',
    description: 'Administra una empresa específica',
    permissions: [
      'can_view_attendance',
      'can_manage_attendance',
      'can_view_payroll',
      'can_generate_payroll',
      'can_export_payroll',
      'can_authorize_payroll',
      'can_view_employees',
      'can_manage_employees',
      'can_view_reports',
      'can_export_reports',
      'can_manage_departments'
    ],
    level: 8
  },
  'hr_manager': {
    id: 'hr_manager',
    name: 'Gerente de RRHH',
    description: 'Gestiona recursos humanos de la empresa',
    permissions: [
      'can_view_attendance',
      'can_manage_attendance',
      'can_view_payroll',
      'can_generate_payroll',
      'can_export_payroll',
      'can_view_employees',
      'can_manage_employees',
      'can_view_reports',
      'can_export_reports',
      'can_manage_departments'
    ],
    level: 7
  },
  'hr_analyst': {
    id: 'hr_analyst',
    name: 'Analista de RRHH',
    description: 'Analiza datos de recursos humanos',
    permissions: [
      'can_view_attendance',
      'can_view_payroll',
      'can_export_payroll',
      'can_view_employees',
      'can_view_reports',
      'can_export_reports'
    ],
    level: 5
  },
  'department_manager': {
    id: 'department_manager',
    name: 'Jefe de Departamento',
    description: 'Gestiona su departamento',
    permissions: [
      'can_view_attendance',
      'can_view_employees',
      'can_view_reports',
      'can_export_reports'
    ],
    level: 4
  },
  'employee': {
    id: 'employee',
    name: 'Empleado',
    description: 'Acceso básico de empleado',
    permissions: [
      'can_register_attendance',
      'can_view_own_attendance',
      'can_view_own_profile'
    ],
    level: 2
  },
  'readonly': {
    id: 'readonly',
    name: 'Solo Lectura',
    description: 'Solo puede ver información',
    permissions: [
      'can_view_attendance',
      'can_view_employees',
      'can_view_reports'
    ],
    level: 1
  }
}

// ===== FUNCIONES DE VALIDACIÓN =====

/**
 * Verifica si un rol tiene un permiso específico
 */
export function roleHasPermission(roleId: string, permissionId: string): boolean {
  const role = ROLES[roleId]
  if (!role) return false
  
  return role.permissions.includes(permissionId)
}

/**
 * Verifica si un usuario tiene un permiso específico
 */
export function userHasPermission(
  userRole: string, 
  userPermissions: Record<string, boolean> | undefined,
  requiredPermission: string
): boolean {
  // Super admin tiene todos los permisos
  if (userRole === 'super_admin') return true
  
  // Verificar si el rol tiene el permiso
  if (roleHasPermission(userRole, requiredPermission)) return true
  
  // Verificar permisos específicos del usuario
  if (userPermissions && userPermissions[requiredPermission]) return true
  
  return false
}

/**
 * Verifica si un usuario tiene todos los permisos requeridos
 */
export function userHasAllPermissions(
  userRole: string,
  userPermissions: Record<string, boolean> | undefined,
  requiredPermissions: string[]
): boolean {
  return requiredPermissions.every(permission => 
    userHasPermission(userRole, userPermissions, permission)
  )
}

/**
 * Verifica si un usuario tiene al menos uno de los permisos requeridos
 */
export function userHasAnyPermission(
  userRole: string,
  userPermissions: Record<string, boolean> | undefined,
  requiredPermissions: string[]
): boolean {
  return requiredPermissions.some(permission => 
    userHasPermission(userRole, userPermissions, permission)
  )
}

/**
 * Obtiene los permisos de un rol
 */
export function getRolePermissions(roleId: string): string[] {
  const role = ROLES[roleId]
  return role ? role.permissions : []
}

/**
 * Valida si un permiso existe
 */
export function isValidPermission(permissionId: string): boolean {
  return permissionId in PERMISSIONS
}

/**
 * Valida si un rol existe
 */
export function isValidRole(roleId: string): boolean {
  return roleId in ROLES
}

/**
 * Obtiene el nivel de un rol
 */
export function getRoleLevel(roleId: string): number {
  const role = ROLES[roleId]
  return role ? role.level : 0
}

/**
 * Verifica si un rol puede acceder a datos de otro rol
 */
export function canAccessRoleData(requesterRole: string, targetRole: string): boolean {
  const requesterLevel = getRoleLevel(requesterRole)
  const targetLevel = getRoleLevel(targetRole)
  
  // Solo puede acceder a roles de menor o igual nivel
  return requesterLevel >= targetLevel
}

/**
 * Obtiene permisos por categoría
 */
export function getPermissionsByCategory(category: Permission['category']): Permission[] {
  return Object.values(PERMISSIONS).filter(p => p.category === category)
}

/**
 * Valida permisos requeridos
 */
export function validateRequiredPermissions(permissions: string[]): { valid: boolean; invalid: string[] } {
  const invalid = permissions.filter(p => !isValidPermission(p))
  return {
    valid: invalid.length === 0,
    invalid
  }
}

// ===== HELPERS DE EXPORTACIÓN =====

const EXPORT_REPORTS_ALLOWED_ROLES: ReadonlySet<string> = new Set([
  'super_admin',
  'company_admin',
  'admin',
  'hr_manager',
])

function readRawPermissions(userProfile: unknown): Record<string, unknown> {
  if (!userProfile || typeof userProfile !== 'object') return {}
  const perms = (userProfile as { permissions?: unknown }).permissions
  if (!perms) return {}
  if (typeof perms === 'string') {
    try {
      const parsed = JSON.parse(perms)
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {}
    } catch {
      return {}
    }
  }
  if (typeof perms === 'object') return perms as Record<string, unknown>
  return {}
}

/**
 * Determina si un usuario puede exportar reportes.
 * Regla: rol con privilegio (super_admin/company_admin/admin/hr_manager/manager)
 * O permiso explícito `can_export_reports: true` en user_profiles.permissions.
 */
export function canExportReports(role: string | undefined | null, userProfile: unknown): boolean {
  const normalized = (role || '').toString().trim().toLowerCase()
  if (EXPORT_REPORTS_ALLOWED_ROLES.has(normalized)) return true
  const raw = readRawPermissions(userProfile)
  return raw.can_export_reports === true
}

/**
 * Mensaje y código estándar para 403 cuando falla canExportReports.
 */
export const EXPORT_REPORTS_FORBIDDEN = {
  status: 403 as const,
  body: {
    error: 'Permisos insuficientes',
    code: 'CANT_EXPORT_REPORTS',
    message: 'No tiene permisos para exportar reportes',
  },
}
