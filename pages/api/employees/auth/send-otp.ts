import { NextApiRequest, NextApiResponse } from 'next'
import { createClient, createAdminClient } from '../../../../lib/supabase/server'
import { logger } from '../../../../lib/logger'
import { sendOtp } from '../../../../lib/employee-otp'

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

    const adminSupabase = createAdminClient()
    
    // Verificar que el empleado existe
    const { data: employee, error: employeeError } = await adminSupabase
      .from('employees')
      .select('id, name, email, status')
      .eq('email', email)
      .eq('status', 'active')
      .single()

    if (employeeError || !employee) {
      logger.warn('Employee not found for OTP recovery', { email, error: employeeError?.message })
      return res.status(400).json({
        success: false,
        error: 'Email no encontrado o empleado inactivo'
      })
    }

    // Enviar OTP usando el sistema existente
    const otpResult = await sendOtp(email, employee.id, employee.name)
    
    if (!otpResult.success) {
      logger.error('Failed to send OTP for password recovery', { email, error: otpResult.error })
      return res.status(500).json({
        success: false,
        error: otpResult.error || 'Error enviando código de recuperación'
      })
    }

    logger.info('OTP sent for password recovery', {
      email,
      employeeId: employee.id,
      employeeName: employee.name
    })

    return res.status(200).json({
      success: true,
      message: 'Código de recuperación enviado a su email'
    })

  } catch (error) {
    logger.error('Send OTP for recovery error', error)
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    })
  }
}