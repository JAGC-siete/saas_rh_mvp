import { NextApiRequest, NextApiResponse } from 'next'
import { createClient, createAdminClient } from '../../../../lib/supabase/server'
import { logger } from '../../../../lib/logger'
import { sendOtp } from '../../../../lib/employee-otp'
import { EMPLOYEE_OTP_SEND_NEUTRAL_MESSAGE } from '../../../../lib/auth/public-auth-messages'
import { enforceAuthRateLimits } from '../../../../lib/security/rate-limiting'

interface SendOtpRequest {
  email: string
}

interface SendOtpResponse {
  success: boolean
  message?: string
  error?: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<SendOtpResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    })
  }

  try {
    const { email }: SendOtpRequest = req.body

    // Validación de entrada
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email inválido' 
      })
    }

    if (!enforceAuthRateLimits(req, res, 'auth_otp_send', email)) {
      return
    }

    const adminSupabase = createAdminClient()
    
    // Verificar que el empleado existe - usar maybeSingle para evitar errores de múltiples filas
    const { data: employee, error: employeeError } = await adminSupabase
      .from('employees')
      .select('id, name, email, status')
      .eq('email', email)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (employeeError) {
      logger.error('Error querying employee for OTP recovery', { error: employeeError?.message })
      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor al buscar empleado'
      })
    }

    if (!employee) {
      logger.warn('OTP recovery request: no active employee (neutral response)')
      return res.status(200).json({
        success: true,
        message: EMPLOYEE_OTP_SEND_NEUTRAL_MESSAGE
      })
    }

    const otpResult = await sendOtp(email, employee.id, employee.name)

    if (!otpResult.success) {
      logger.error('Failed to send OTP for password recovery', { error: otpResult.error })
      return res.status(500).json({
        success: false,
        error: 'No se pudo enviar el código. Intenta más tarde.'
      })
    }

    logger.info('OTP sent for password recovery', { employeeId: employee.id })

    return res.status(200).json({
      success: true,
      message: EMPLOYEE_OTP_SEND_NEUTRAL_MESSAGE
    })

  } catch (error) {
    logger.error('Send OTP for recovery error', error)
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    })
  }
}