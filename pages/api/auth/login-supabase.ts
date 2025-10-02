import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../lib/supabase/server'
import { logger } from '../../../lib/logger'

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

    if (authError || !authData.user) {
      logger.warn('Login failed', { email, error: authError?.message })
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas'
      })
    }

    // Verificar que el usuario tiene los metadatos correctos para empleados
    const userMetadata = authData.user.user_metadata
    if (!userMetadata?.employee_id || !userMetadata?.is_employee_portal) {
      logger.warn('User login successful but not an employee portal user', { 
        email, 
        userId: authData.user.id,
        userMetadata 
      })
      return res.status(403).json({
        success: false,
        error: 'Acceso denegado. Este portal es solo para empleados.'
      })
    }

    logger.info('Employee login successful', {
      email,
      userId: authData.user.id,
      employeeId: userMetadata.employee_id
    })

    return res.status(200).json({
      success: true,
      message: 'Login exitoso',
      user: authData.user,
      session: authData.session
    })

  } catch (error) {
    logger.error('Login error', error)
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    })
  }
}