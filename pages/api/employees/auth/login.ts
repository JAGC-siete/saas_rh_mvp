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
    
    // Step 1: Send OTP (if no code provided)
    if (!code) {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { 
          shouldCreateUser: false // No crear usuario si no existe
        }
      })
      
      if (error) {
        logger.warn('Failed to send OTP', { email, error: error.message })
        return res.status(400).json({
          success: false,
          error: error.message.includes('User not found') 
            ? 'Email no encontrado o empleado inactivo'
            : error.message
        })
      }

      logger.info('OTP sent successfully', { email })
      
      return res.status(200).json({
        success: true,
        step: 'send_code',
        message: 'Código enviado a su email'
      })
    }

    // Step 2: Verify OTP
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'email'
    })

    if (error || !data.user) {
      logger.warn('OTP verification failed', { email, error: error?.message })
      return res.status(401).json({
        success: false,
        error: 'Código inválido o expirado'
      })
    }

    // Get employee data from user metadata
    const employeeId = data.user.user_metadata?.employee_id
    const employeeName = data.user.user_metadata?.full_name
    const companyId = data.user.user_metadata?.company_id

    logger.info('Employee login successful via Supabase OTP', {
      employeeId,
      employeeName,
      email,
      userId: data.user.id
    })

    return res.status(200).json({
      success: true,
      step: 'verify_code',
      user: data.user,
      session: data.session,
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
