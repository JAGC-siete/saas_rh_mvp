import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../lib/supabase/server'
import { logger } from '../../../lib/logger'
import { createSessionOnLogin } from '../../../lib/middleware/session-manager'

interface LoginRequest {
  email: string
  password: string
}

interface LoginResponse {
  success: boolean
  message?: string
  error?: string
  user?: any
  session?: any
  userProfile?: any
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<LoginResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    })
  }

  try {
    const { email, password }: LoginRequest = req.body

    // Validación de entrada
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email y contraseña son requeridos' 
      })
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email inválido' 
      })
    }

    const supabase = createClient(req, res)
    
    // Intentar login con Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    })

    // CRITICAL: Wait for cookies to be set before proceeding
    // This ensures the session is properly established
    await new Promise(resolve => setTimeout(resolve, 100))

    if (authError || !authData.user) {
      logger.warn('Login failed', { email, error: authError?.message })
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas'
      })
    }

    // Verificar el tipo de usuario y permisos
    const userMetadata = authData.user.user_metadata
    
    // Verificar si es un usuario admin o empleado válido
    let userType = 'unknown'
    let hasValidAccess = false
    
    // Verificar si es empleado (tiene employee_id y is_employee_portal)
    if (userMetadata?.employee_id && userMetadata?.is_employee_portal) {
      userType = 'employee'
      hasValidAccess = true
    } 
    // Verificar si es admin (buscar en user_profiles)
    else {
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('role, permissions')
        .eq('id', authData.user.id)
        .single()
      
      if (!profileError && userProfile) {
        // Admin roles include: super_admin, company_admin, hr_manager
        const adminRoles = ['super_admin', 'admin', 'company_admin', 'hr_manager']
        if (adminRoles.includes(userProfile.role)) {
          userType = 'admin'
          hasValidAccess = true
        } else if (userProfile.role === 'employee') {
          userType = 'employee'
          hasValidAccess = true
        }
      }
    }
    
    if (!hasValidAccess) {
      logger.warn('User login successful but no valid access permissions', { 
        email, 
        userId: authData.user.id,
        userMetadata,
        userType
      })
      return res.status(403).json({
        success: false,
        error: 'Acceso denegado. Usuario sin permisos válidos.'
      })
    }

    logger.info(`${userType} login successful`, {
      email,
      userId: authData.user.id,
      userType,
      employeeId: userMetadata?.employee_id || null
    })

    // Obtener información adicional del perfil de usuario
    let userProfile = null
    if (userType === 'admin') {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single()
      userProfile = profile
    }

    // CRITICAL: Create session in user_sessions table for idle timeout tracking
    const sessionResult = await createSessionOnLogin(
      req,
      res,
      authData.user.id,
      authData.session,
      userProfile?.company_id || userMetadata?.company_id || null
    )

    if (!sessionResult.success) {
      logger.warn('Failed to create session record', {
        userId: authData.user.id,
        email
      })
      // Continue anyway - don't block login, but idle timeout won't work
    }

    return res.status(200).json({
      success: true,
      message: 'Login exitoso',
      user: {
        ...authData.user,
        company_id: userProfile?.company_id || userMetadata?.company_id || null,
        role: userProfile?.role || userMetadata?.role || null,
        user_type: userType
      },
      session: authData.session,
      userProfile: userProfile
    })

  } catch (error) {
    logger.error('Login error', error)
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    })
  }
}