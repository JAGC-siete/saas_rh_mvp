import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from './supabase/server'

export interface AuthResult {
  success: boolean
  user?: any
  userProfile?: any
  error?: string
  message?: string
}

export interface RolePermissions {
  [key: string]: string[]
}

// Definir permisos por rol
const ROLE_PERMISSIONS: RolePermissions = {
  'super_admin': ['*'], // Todos los permisos
  'company_admin': [
    'can_view_employees',
    'can_manage_employees',
    'can_approve_leave',
    'can_view_payroll',
    'can_manage_attendance',
    'can_manage_departments',
    'can_view_reports'
  ],
  'hr_manager': [
    'can_view_employees',
    'can_manage_employees',
    'can_approve_leave',
    'can_view_payroll',
    'can_manage_attendance',
    'can_view_reports'
  ],
  'manager': [
    'can_view_employees',
    'can_manage_attendance',
    'can_approve_leave',
    'can_view_reports'
  ],
  'employee': [
    'can_view_own_attendance',
    'can_register_attendance'
  ]
}

/**
 * Autentica y autoriza un usuario para un endpoint
 */
export async function authenticateUser(
  req: NextApiRequest, 
  res: NextApiResponse,
  requiredPermissions: string[] = []
): Promise<AuthResult> {
  try {
    const supabase = createClient(req, res)
    // ✅ Usar getUser() para validar token con servidor de Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return {
        success: false,
        error: 'No autorizado',
        message: 'Debe iniciar sesión para acceder a este recurso'
      }
    }

    // Obtener perfil del usuario
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, role, permissions, company_id, is_active, employee_id')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile) {
      return {
        success: false,
        error: 'Perfil no encontrado',
        message: 'Su perfil de usuario no está configurado correctamente'
      }
    }

    // Verificar si el usuario está activo
    if (!userProfile.is_active) {
      return {
        success: false,
        error: 'Usuario inactivo',
        message: 'Su cuenta ha sido desactivada'
      }
    }

    // Verificar permisos requeridos
    if (requiredPermissions.length > 0) {
      const userRole = userProfile.role
      const allowedPermissions = ROLE_PERMISSIONS[userRole] || []
      
      // Super admin tiene todos los permisos
      if (userRole === 'super_admin') {
        return {
          success: true,
          user: user,
          userProfile
        }
      }

      // Verificar permisos del rol primero
      const hasRolePermissions = requiredPermissions.every(permission => 
        allowedPermissions.includes(permission) || allowedPermissions.includes('*')
      )

      // Verificar permisos específicos del usuario si están definidos
      let hasUserPermissions = false
      if (userProfile.permissions) {
        const userSpecificPermissions = Object.keys(userProfile.permissions)
          .filter(key => userProfile.permissions[key] === true)
        
        hasUserPermissions = requiredPermissions.every(permission =>
          userSpecificPermissions.includes(permission)
        )
      }

      // El usuario necesita tener los permisos YA SEA del rol O específicos
      const hasRequiredPermissions = hasRolePermissions || hasUserPermissions

      if (!hasRequiredPermissions) {
        return {
          success: false,
          error: 'Permisos insuficientes',
          message: `No tiene permisos para: ${requiredPermissions.join(', ')}`
        }
      }
    }

    console.log('🔐 Usuario autenticado:', { 
      userId: user.id, 
      role: userProfile.role,
      companyId: userProfile.company_id,
      permissions: requiredPermissions
    })

    return {
      success: true,
      user: user,
      userProfile
    }

  } catch (error) {
    console.error('❌ Error de autenticación:', error)
    return {
      success: false,
      error: 'Error de autenticación',
      message: 'No se pudo verificar la autenticación'
    }
  }
}

/**
 * Middleware para proteger endpoints con autenticación
 */
export function withAuth(requiredPermissions: string[] = []) {
  return async (req: NextApiRequest, res: NextApiResponse, next: () => void) => {
    const authResult = await authenticateUser(req, res, requiredPermissions)
    
    if (!authResult.success) {
      return res.status(401).json({
        error: authResult.error,
        message: authResult.message
      })
    }
    
    // Agregar información del usuario al request
    ;(req as any).user = authResult.user
    ;(req as any).userProfile = authResult.userProfile
    
    next()
  }
}

/**
 * Verifica si un usuario tiene un permiso específico
 */
export function hasPermission(userProfile: any, permission: string): boolean {
  if (!userProfile) return false
  
  // Super admin tiene todos los permisos
  if (userProfile.role === 'super_admin') return true
  
  // Verificar permisos del rol
  const rolePermissions = ROLE_PERMISSIONS[userProfile.role] || []
  if (rolePermissions.includes(permission) || rolePermissions.includes('*')) {
    return true
  }
  
  // Verificar permisos específicos del usuario
  if (userProfile.permissions && userProfile.permissions[permission]) {
    return true
  }
  
  return false
}

/**
 * Filtra datos por company_id si el usuario no es super_admin
 */
export function filterByCompany(query: any, userProfile: any) {
  if (userProfile.role === 'super_admin') {
    return query
  }
  
  return query.eq('company_id', userProfile.company_id)
} 