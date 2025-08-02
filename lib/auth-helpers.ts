import { createClient } from './supabase/server'
import { NextApiRequest, NextApiResponse } from 'next'

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
 * Obtiene o crea el perfil del usuario
 */
export async function getOrCreateProfile(supabase: any, userId: string): Promise<UserProfile> {
  try {
    // Intentar obtener el perfil existente
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error && error.code === 'PGRST116') {
      // No existe el perfil, crearlo
      console.log('🔧 Creando perfil para usuario:', userId)
      
      const { data: newProfile, error: insertError } = await supabase
        .from('user_profiles')
        .insert({
          id: userId,
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
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (insertError) {
        console.error('❌ Error creando perfil:', insertError)
        throw new Error(`Error creando perfil: ${insertError.message}`)
      }

      console.log('✅ Perfil creado exitosamente:', newProfile)
      return newProfile
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
 * Verifica si un usuario tiene un permiso específico
 */
export function hasPermission(userProfile: UserProfile, permission: string): boolean {
  // Super admin tiene todos los permisos
  if (userProfile.role === 'super_admin') return true
  
  // Verificar permisos específicos del usuario
  if (userProfile.permissions && userProfile.permissions[permission]) {
    return true
  }
  
  return false
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
    const supabase = getSupabaseClient(req, res)
    
    // 1. Verificar sesión
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('❌ Error obteniendo sesión:', sessionError)
      return {
        success: false,
        error: 'Error de sesión',
        message: 'No se pudo verificar la sesión'
      }
    }

    if (!session) {
      console.log('⚠️ No hay sesión activa')
      return {
        success: false,
        error: 'No autorizado',
        message: 'Debe iniciar sesión para acceder a este recurso'
      }
    }

    console.log('🔐 Sesión válida encontrada:', {
      userId: session.user.id,
      email: session.user.email
    })

    // 2. Obtener o crear perfil
    let userProfile: UserProfile
    try {
      userProfile = await getOrCreateProfile(supabase, session.user.id)
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

    // 4. Verificar permisos requeridos
    if (requiredPermissions.length > 0) {
      const hasAllPermissions = requiredPermissions.every(permission => 
        hasPermission(userProfile, permission)
      )

      if (!hasAllPermissions) {
        return {
          success: false,
          error: 'Permisos insuficientes',
          message: `No tiene permisos para: ${requiredPermissions.join(', ')}`
        }
      }
    }

    console.log('✅ Usuario autenticado y autorizado:', {
      userId: session.user.id,
      role: userProfile.role,
      permissions: requiredPermissions
    })

    return {
      success: true,
      user: session.user,
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