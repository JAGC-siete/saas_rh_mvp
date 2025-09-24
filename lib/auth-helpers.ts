import { createClient } from './supabase/server'
import { NextApiRequest, NextApiResponse } from 'next'
import { getHondurasTimestamp } from './timezone'
import { 
  userHasAllPermissions, 
  userHasAnyPermission, 
  validateRequiredPermissions,
  isValidRole,
  ROLES 
} from './security/permissions'
import { createSecureErrorResponse, createAuthErrorResponse, createAuthorizationErrorResponse } from './security/error-handling'



export interface UserProfile {
  id: string
  role: string
  company_id?: string
  is_active: boolean
  permissions?: any
  created_at: string
  updated_at: string
}

export interface AuthResult {
  success: boolean
  user?: any
  userProfile?: UserProfile
  error?: string
  message?: string
}

/**
 * Helper para crear Supabase client en API routes
 */
export function getSupabaseClient(req: NextApiRequest, res: NextApiResponse) {
  return createClient(req, res)
}

/**
 * Obtiene o crea el perfil del usuario (VERSIÓN TEMPORAL SIN RLS)
 */
export async function getOrCreateProfile(supabase: any, userId: string): Promise<UserProfile> {
  try {
    console.log('🔧 Intentando obtener perfil para usuario:', userId)
    
    // Intentar obtener el perfil existente
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error && error.code === 'PGRST116') {
      // No existe el perfil, crearlo
      console.log('🔧 Perfil no encontrado, creando...')
      
      // ⚠️ CRÍTICO: No crear perfiles con company_id hardcodeado
      console.error('❌ CRITICAL: Attempting to create profile with hardcoded company_id')
      console.error('❌ This should not happen in production. User needs to be assigned to a company first.')
      
      throw new Error('PROFILE_CREATION_BLOCKED: No se puede crear perfil sin company_id válido. Contacte al administrador.')
      
      // CÓDIGO COMENTADO - NO USAR EN PRODUCCIÓN
      /*
      const { data: newProfile, error: insertError } = await supabase
        .from('user_profiles')
        .insert({
          id: userId,
          company_id: '00000000-0000-0000-0000-000000000001', // Paragon Honduras por defecto
          role: 'super_admin',
          is_active: true,
          permissions: {
            can_manage_employees: true,
            can_view_payroll: true,
            can_manage_attendance: true,
            can_manage_departments: true,
            can_view_reports: true,
            can_manage_companies: true,
            can_generate_payroll: true,
            can_export_payroll: true,
            can_view_own_attendance: true,
            can_register_attendance: true
          },
          created_at: getHondurasTimestamp(),
          updated_at: getHondurasTimestamp()
        })
        .select()
        .single()

      if (insertError) {
        console.error('❌ Error creando perfil:', insertError)
        throw new Error(`Error creando perfil: ${insertError.message}`)
      }

      console.log('✅ Perfil creado exitosamente:', newProfile)
      return newProfile
      */
    }

    if (error) {
      console.error('❌ Error obteniendo perfil:', error)
      throw new Error(`Error obteniendo perfil: ${error.message}`)
    }

    console.log('✅ Perfil encontrado:', data)
    return data
  } catch (error) {
    console.error('❌ Error en getOrCreateProfile:', error)
    throw error
  }
}

/**
 * Verifica si un usuario tiene un rol específico
 */
export function hasRole(userProfile: UserProfile, role: string): boolean {
  return userProfile.role === role || userProfile.role === 'super_admin'
}

/**
 * Verifica si un usuario tiene un permiso específico (VERSIÓN SEGURA)
 */
export function hasPermission(userProfile: UserProfile, permission: string): boolean {
  return userHasAnyPermission(
    userProfile.role, 
    userProfile.permissions, 
    [permission]
  )
}

/**
 * Verifica si un usuario tiene todos los permisos requeridos (VERSIÓN SEGURA)
 */
export function hasAllPermissions(userProfile: UserProfile, permissions: string[]): boolean {
  return userHasAllPermissions(
    userProfile.role,
    userProfile.permissions,
    permissions
  )
}

/**
 * Verifica si un usuario tiene al menos uno de los permisos requeridos (VERSIÓN SEGURA)
 */
export function hasAnyPermission(userProfile: UserProfile, permissions: string[]): boolean {
  return userHasAnyPermission(
    userProfile.role,
    userProfile.permissions,
    permissions
  )
}

/**
 * Autentica y autoriza un usuario para un endpoint (VERSIÓN SEGURA)
 */
export async function authenticateUser(
  req: NextApiRequest, 
  res: NextApiResponse,
  requiredPermissions: string[] = []
): Promise<AuthResult> {
  try {
    const supabase = getSupabaseClient(req, res)
    
    // 1. ✅ Verificar usuario con getUser() para validar token con servidor
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      console.error('❌ Error obteniendo usuario:', authError)
      return {
        success: false,
        error: 'Error de autenticación',
        message: 'No se pudo verificar la autenticación'
      }
    }

    if (!user) {
      console.log('⚠️ No hay usuario autenticado')
      return {
        success: false,
        error: 'No autorizado',
        message: 'Debe iniciar sesión para acceder a este recurso'
      }
    }

    console.log('🔐 Usuario válido encontrado:', {
      userId: user.id,
      email: user.email
    })

    // 2. Obtener o crear perfil
    let userProfile: UserProfile
    try {
      userProfile = await getOrCreateProfile(supabase, user.id)
    } catch (profileError) {
      console.error('❌ Error con perfil:', profileError)
      return {
        success: false,
        error: 'Error de perfil',
        message: 'No se pudo obtener o crear el perfil de usuario'
      }
    }

    // 3. Verificar si el usuario está activo
    if (!userProfile.is_active) {
      return {
        success: false,
        error: 'Usuario inactivo',
        message: 'Su cuenta ha sido desactivada'
      }
    }

    // 4. ✅ VALIDAR ROL DEL USUARIO
    if (!isValidRole(userProfile.role)) {
      console.error('❌ Rol inválido:', userProfile.role)
      return {
        success: false,
        error: 'Rol inválido',
        message: 'El rol del usuario no es válido'
      }
    }

    // 5. ✅ VALIDAR PERMISOS REQUERIDOS (IMPLEMENTACIÓN REAL)
    if (requiredPermissions.length > 0) {
      // Validar que los permisos requeridos sean válidos
      const permissionValidation = validateRequiredPermissions(requiredPermissions)
      if (!permissionValidation.valid) {
        console.error('❌ Permisos inválidos requeridos:', permissionValidation.invalid)
        return {
          success: false,
          error: 'Configuración inválida',
          message: 'Permisos requeridos no válidos'
        }
      }

      // Verificar si el usuario tiene los permisos requeridos
      const hasPermissions = hasAllPermissions(userProfile, requiredPermissions)
      if (!hasPermissions) {
        console.warn('⚠️ Usuario sin permisos suficientes:', {
          userId: user.id,
          role: userProfile.role,
          requiredPermissions,
          userPermissions: userProfile.permissions
        })
        
        return {
          success: false,
          error: 'Permisos insuficientes',
          message: 'No tiene permisos para acceder a este recurso'
        }
      }
    }

    // 6. ✅ LOG DE ACCESO EXITOSO
    console.log('✅ Usuario autenticado y autorizado:', {
      userId: user.id,
      role: userProfile.role,
      companyId: userProfile.company_id,
      requiredPermissions,
      timestamp: new Date().toISOString()
    })

    return {
      success: true,
      user: user,
      userProfile
    }

  } catch (error) {
    console.error('❌ Error general de autenticación:', error)
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
 * Filtra datos por company_id si el usuario no es super_admin
 */
export function filterByCompany(query: any, userProfile: UserProfile) {
  if (userProfile.role === 'super_admin') {
    return query
  }
  
  return query.eq('company_id', userProfile.company_id)
} 