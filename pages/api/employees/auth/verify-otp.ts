import { NextApiRequest, NextApiResponse } from 'next'
import { createClient, createAdminClient } from '../../../../lib/supabase/server'
import { logger } from '../../../../lib/logger'
import { verifyOtp } from '../../../../lib/employee-otp'
import { EMPLOYEE_OTP_VERIFY_NEUTRAL_ERROR } from '../../../../lib/auth/public-auth-messages'
import { enforceAuthRateLimits } from '../../../../lib/security/rate-limiting'
import { openEmployeePortalSession } from '../../../../lib/auth/employee-portal-session'

interface VerifyOtpRequest {
  email: string
  code: string
}

interface VerifyOtpResponse {
  success: boolean
  message?: string
  error?: string
  sessionData?: any
  session?: any
  user?: any
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<VerifyOtpResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    })
  }

  try {
    const { email, code }: VerifyOtpRequest = req.body

    // Validación de entrada
    if (!email || !code) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email y código son requeridos' 
      })
    }

    if (!/^[0-9]{6}$/.test(code)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Código debe ser de 6 dígitos' 
      })
    }

    if (!enforceAuthRateLimits(req, res, 'auth_otp_verify', email)) {
      return
    }

    const adminSupabase = createAdminClient()
    
    // Verificar que el empleado existe - usar maybeSingle para evitar errores de múltiples filas
    const { data: employee, error: employeeError } = await adminSupabase
      .from('employees')
      .select('id, name, email, status, company_id')
      .eq('email', email)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (employeeError) {
      logger.error('Error querying employee for OTP verification', { email, error: employeeError?.message })
      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor al buscar empleado'
      })
    }

    if (!employee) {
      logger.warn('Employee not found for OTP verification (neutral error)')
      return res.status(400).json({
        success: false,
        error: EMPLOYEE_OTP_VERIFY_NEUTRAL_ERROR
      })
    }

    // Verificar OTP
    const otpResult = await verifyOtp(email, code)
    
    if (!otpResult.success) {
      logger.warn('OTP verification failed for password recovery', { email, error: otpResult.error })
      return res.status(400).json({
        success: false,
        error: otpResult.error || 'Código inválido o expirado'
      })
    }

    const portal = await openEmployeePortalSession(adminSupabase, createClient(req, res), email, employee)

    if (!portal.ok) {
      return res.status(portal.status).json({
        success: false,
        error: portal.error
      })
    }

    logger.info('Employee login successful via OTP recovery', {
      email,
      employeeId: employee.id,
      supabaseUserId: portal.user.id
    })

    return res.status(200).json({
      success: true,
      message: 'Acceso recuperado exitosamente',
      session: portal.session,
      user: portal.user,
      sessionData: {
        user: portal.user,
        session: portal.session
      }
    })

  } catch (error) {
    logger.error('Verify OTP for recovery error', error)
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    })
  }
}