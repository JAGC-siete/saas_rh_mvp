/**
 * Centralized role validation utilities
 * Simplifies role checking logic across the application
 */

export interface UserProfile {
  id: string
  role: string
  company_id?: string
  is_active: boolean
}

export type RoleLevel = 'super_admin' | 'company_admin' | 'hr_manager' | 'employee'

/**
 * Role hierarchy levels (higher number = more permissions)
 */
export const ROLE_LEVELS: Record<RoleLevel, number> = {
  super_admin: 4,
  company_admin: 3,
  hr_manager: 2,
  employee: 1
}

/**
 * Check if a user has a specific role
 */
export function hasRole(userProfile: UserProfile | null, requiredRole: RoleLevel): boolean {
  if (!userProfile || !userProfile.is_active) return false
  return userProfile.role === requiredRole
}

/**
 * Check if a user has any of the specified roles
 */
export function hasAnyRole(userProfile: UserProfile | null, requiredRoles: RoleLevel[]): boolean {
  if (!userProfile || !userProfile.is_active) return false
  return requiredRoles.includes(userProfile.role as RoleLevel)
}

/**
 * Check if a user has a role level equal or higher than required
 */
export function hasRoleLevel(userProfile: UserProfile | null, requiredLevel: RoleLevel): boolean {
  if (!userProfile || !userProfile.is_active) return false
  
  const userLevel = ROLE_LEVELS[userProfile.role as RoleLevel] || 0
  const requiredLevelValue = ROLE_LEVELS[requiredLevel]
  
  return userLevel >= requiredLevelValue
}

/**
 * Check if a user can access admin functions
 */
export function canAccessAdmin(userProfile: UserProfile | null): boolean {
  return hasAnyRole(userProfile, ['super_admin', 'company_admin', 'hr_manager'])
}

/**
 * Check if a user can access super admin functions
 */
export function canAccessSuperAdmin(userProfile: UserProfile | null): boolean {
  return hasRole(userProfile, 'super_admin')
}

/**
 * Check if a user can access company-specific admin functions
 */
export function canAccessCompanyAdmin(userProfile: UserProfile | null, companyId?: string): boolean {
  if (!userProfile || !userProfile.is_active) return false
  
  // Super admin can access any company
  if (userProfile.role === 'super_admin') return true
  
  // Company admin and HR manager need matching company_id
  if (['company_admin', 'hr_manager'].includes(userProfile.role)) {
    return companyId ? userProfile.company_id === companyId : !!userProfile.company_id
  }
  
  return false
}

/**
 * Get required roles for a specific API path
 */
export function getRequiredRolesForPath(pathname: string): {
  roles: RoleLevel[]
  isSuperAdminOnly: boolean
  requiresCompanyAccess: boolean
} {
  // Super admin only endpoints
  const superAdminOnlyPaths = [
    '/api/admin/users',
    '/api/admin/companies',
    '/api/admin/stats',
    '/api/admin/recent-activity'
  ]
  
  // Check if path requires super admin only
  const isSuperAdminOnly = superAdminOnlyPaths.some(path => pathname.startsWith(path))
  
  if (isSuperAdminOnly) {
    return {
      roles: ['super_admin'],
      isSuperAdminOnly: true,
      requiresCompanyAccess: false
    }
  }
  
  // Admin endpoints (super_admin, company_admin, hr_manager)
  const adminPaths = [
    '/api/admin/',
    '/api/dashboard/',
    '/api/employees/',
    '/api/departments/',
    '/api/payroll/',
    '/api/reports/'
  ]
  
  const requiresAdmin = adminPaths.some(path => pathname.startsWith(path))
  
  if (requiresAdmin) {
    return {
      roles: ['super_admin', 'company_admin', 'hr_manager'],
      isSuperAdminOnly: false,
      requiresCompanyAccess: !pathname.includes('/admin/')
    }
  }
  
  // Default: any authenticated user
  return {
    roles: ['super_admin', 'company_admin', 'hr_manager', 'employee'],
    isSuperAdminOnly: false,
    requiresCompanyAccess: true
  }
}

/**
 * Validate user permissions for a specific path
 */
export function validateUserPermissions(
  userProfile: UserProfile | null,
  pathname: string,
  companyId?: string
): {
  hasAccess: boolean
  reason?: string
  requiredRoles: RoleLevel[]
} {
  const { roles, isSuperAdminOnly, requiresCompanyAccess } = getRequiredRolesForPath(pathname)
  
  // Check basic role access
  if (!hasAnyRole(userProfile, roles)) {
    return {
      hasAccess: false,
      reason: `Insufficient role. Required: ${roles.join(' or ')}, User: ${userProfile?.role || 'none'}`,
      requiredRoles: roles
    }
  }
  
  // Check company access if required
  if (requiresCompanyAccess && !canAccessCompanyAdmin(userProfile, companyId)) {
    return {
      hasAccess: false,
      reason: `Company access required. User company: ${userProfile?.company_id || 'none'}, Required: ${companyId || 'any'}`,
      requiredRoles: roles
    }
  }
  
  return {
    hasAccess: true,
    requiredRoles: roles
  }
}

