import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../../lib/supabase/server'
import { logger } from '../../../../lib/logger'

interface LoginRequest {
  email: string
  code?: string // Optional for step 2 (OTP verification)
}

interface LoginResponse {
  success: boolean
  step?: 'send_code' | 'verify_code'
  message?: string
  user?: any
  session?: any
  employee?: {
    id: string
    name: string
    dni_masked: string
    role: string
    department?: string
  }
  error?: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<LoginResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    })
  }

  try {
    const { email, code }: LoginRequest = req.body

    // Input validation
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email inválido' 
      })
    }

    const supabase = createClient(req, res)
    
    // Step 1: Send OTP (if no code provided) - USAR CUSTOM OTP PARA NO JODER MAGIC LINKS
    if (!code) {
      // Verificar que el usuario existe en auth.users
      const { data: existingUser, error: userError } = await supabase.auth.admin.getUserByEmail(email)
      
      if (userError || !existingUser) {
        logger.warn('Employee user not found', { email, error: userError?.message })
        return res.status(400).json({
          success: false,
          error: 'Email no encontrado o empleado inactivo'
        })
      }

      // Usar el sistema OTP anterior que YA FUNCIONABA
      const { sendOtp } = await import('../../../../lib/employee-otp')
      const employeeId = existingUser.user.user_metadata?.employee_id
      const employeeName = existingUser.user.user_metadata?.full_name
      
      if (!employeeId) {
        return res.status(400).json({
          success: false,
          error: 'Datos de empleado no encontrados'
        })
      }

      const otpResult = await sendOtp(email, employeeId, employeeName)
      
      return res.status(otpResult.success ? 200 : 500).json({
        success: otpResult.success,
        step: 'send_code',
        message: otpResult.message,
        error: otpResult.error
      })
    }

    // Step 2: Verify OTP - USAR CUSTOM VERIFICATION + SUPABASE SESSION
    const { verifyOtp } = await import('../../../../lib/employee-otp')
    const otpVerification = verifyOtp(email, code)
    
    if (!otpVerification.success) {
      return res.status(401).json({
        success: false,
        error: otpVerification.error
      })
    }

    // OTP válido, ahora crear sesión Supabase manualmente
    const { data: existingUser, error: userError } = await supabase.auth.admin.getUserByEmail(email)
    
    if (userError || !existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Usuario no encontrado'
      })
    }

    // Crear sesión usando admin API
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: 'https://humanosisu.net/employees/portal'
      }
    })

    if (sessionError) {
      logger.error('Failed to create session', sessionError)
      return res.status(500).json({
        success: false,
        error: 'Error creando sesión'
      })
    }

    // Get employee data from user metadata
    const employeeId = existingUser.user.user_metadata?.employee_id
    const employeeName = existingUser.user.user_metadata?.full_name
    const companyId = existingUser.user.user_metadata?.company_id

    logger.info('Employee login successful via Custom OTP + Supabase Session', {
      employeeId,
      employeeName,
      email,
      userId: existingUser.user.id
    })

    return res.status(200).json({
      success: true,
      step: 'verify_code',
      user: existingUser.user,
      session: sessionData,
      employee: {
        id: employeeId,
        name: employeeName,
        dni_masked: 'Protected',
        role: 'Empleado',
        department: 'N/A'
      }
    })

  } catch (error) {
    logger.error('Employee login error', error)
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    })
  }
}
