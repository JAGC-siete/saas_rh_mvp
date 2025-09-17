import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../../lib/supabase/server'
import { logger } from '../../../../lib/logger'

// TIMING ATTACK PROTECTION: Always delay response by this amount
const RESPONSE_DELAY_MS = 500

interface LoginRequest {
  last5: string
  pin: string
}

interface LoginResponse {
  success: boolean
  sessionToken?: string
  employee?: {
    id: string
    name: string
    dni_masked: string
    role: string
    department?: string
  }
  expiresAt?: string
  error?: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<LoginResponse>) {
  const startTime = Date.now()
  
  // UNIFORM RESPONSE: Always return same structure and timing
  const sendUniformResponse = async (response: LoginResponse, statusCode: number = 401) => {
    const elapsed = Date.now() - startTime
    const remainingDelay = Math.max(0, RESPONSE_DELAY_MS - elapsed)
    
    if (remainingDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, remainingDelay))
    }
    
    return res.status(statusCode).json(response)
  }

  if (req.method !== 'POST') {
    return sendUniformResponse({ success: false, error: 'Method not allowed' }, 405)
  }

  const { last5, pin }: LoginRequest = req.body
  
  // FIXED: Handle multiple IPs in x-forwarded-for (proxy chain)
  const forwardedFor = req.headers['x-forwarded-for'] as string
  const clientIP = forwardedFor 
    ? forwardedFor.split(',')[0].trim() // Take first IP only
    : req.connection.remoteAddress || '127.0.0.1'
    
  const userAgent = req.headers['user-agent'] || 'unknown'

  // Input validation - SAME error message for all cases
  if (!last5 || !pin || !/^\d{5}$/.test(last5) || !/^\d{4}$/.test(pin)) {
    return sendUniformResponse({ 
      success: false, 
      error: 'Credenciales inválidas' 
    })
  }

  try {
    const supabase = createAdminClient()

    // SECURE: Get peppers from environment (NOT from DB session)
    const pinPepper = process.env.EMPLOYEE_PIN_PEPPER
    const last5Pepper = process.env.EMPLOYEE_LAST5_PEPPER
    
    if (!pinPepper || pinPepper.length < 32) {
      logger.error('PIN pepper not configured or too short')
      return sendUniformResponse({
        success: false,
        error: 'Configuración de seguridad inválida'
      }, 500)
    }
    
    if (!last5Pepper || last5Pepper.length < 32) {
      logger.error('Last5 pepper not configured or too short')
      return sendUniformResponse({
        success: false,
        error: 'Configuración de seguridad inválida'
      }, 500)
    }

    // HARDENED: Use SECURITY DEFINER function with app-provided peppers
    const { data: authResult, error: authError } = await supabase
      .rpc('authenticate_employee', {
        p_company_id: '00000000-0000-0000-0000-000000000001', // Paragon company ID
        p_last5: last5,
        p_pin: pin,
        p_pin_pepper: pinPepper,
        p_last5_pepper: last5Pepper,
        p_ip_address: clientIP.split(',')[0].trim(), // FIXED: Solo primera IP para INET
        p_user_agent: userAgent
      })
      .single()

    if (authError) {
      logger.error('Employee auth function error', authError)
      return sendUniformResponse({
        success: false,
        error: 'Credenciales inválidas'
      })
    }

    // Handle different auth results with UNIFORM timing
    const result = authResult as any
    
    if (!result.success) {
      if (result.locked_until) {
        const lockMinutes = Math.ceil((new Date(result.locked_until).getTime() - Date.now()) / 60000)
        return sendUniformResponse({
          success: false,
          error: `Cuenta bloqueada. Intente en ${lockMinutes} minutos.`
        }, 429)
      }
      
      return sendUniformResponse({
        success: false,
        error: 'Credenciales inválidas'
      })
    }

    // SUCCESS: Log and return session data
    logger.info('Employee authentication successful', {
      employeeId: result.employee_data.id,
      employeeName: result.employee_data.name,
      clientIP,
      sessionTokenPrefix: result.session_token.substring(0, 8) + '...'
    })

    return sendUniformResponse({
      success: true,
      sessionToken: result.session_token,
      expiresAt: result.expires_at,
      employee: result.employee_data
    }, 200)

  } catch (error) {
    logger.error('Employee auth unexpected error', error)
    return sendUniformResponse({
      success: false,
      error: 'Credenciales inválidas'
    })
  }
}

// All auth logic now handled by the SECURITY DEFINER function in the database
