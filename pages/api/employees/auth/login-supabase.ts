import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../../lib/supabase/server'
import { logger } from '../../../../lib/logger'

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

const RESPONSE_DELAY_MS = 500 // Uniform timing to prevent timing attacks

export default async function handler(req: NextApiRequest, res: NextApiResponse<LoginResponse>) {
  const startTime = Date.now()
  
  // UNIFORM RESPONSE: Always return same structure and timing
  const sendUniformResponse = async (response: LoginResponse, statusCode: number = 401) => {
    const elapsed = Date.now() - startTime
    const delay = Math.max(0, RESPONSE_DELAY_MS - elapsed)
    
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay))
    }
    
    return res.status(statusCode).json(response)
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    })
  }

  try {
    const { last5, pin }: LoginRequest = req.body

    // Parse client IP properly
    const forwardedFor = req.headers['x-forwarded-for'] as string
    const clientIP = forwardedFor 
      ? forwardedFor.split(',')[0].trim()
      : req.connection.remoteAddress || '127.0.0.1'
      
    const userAgent = req.headers['user-agent'] || 'unknown'

    // Input validation
    if (!last5 || !pin || !/^\d{5}$/.test(last5) || !/^\d{4}$/.test(pin)) {
      return sendUniformResponse({ 
        success: false, 
        error: 'Credenciales inválidas' 
      })
    }

    // Create Supabase client
    const supabase = createClient(req, res)
    
    // STRATEGY: Use synthetic email for Supabase Auth
    const syntheticEmail = `${last5}@paragon.employee.local`
    
    // Authenticate using Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: syntheticEmail,
      password: pin
    })

    if (authError || !authData.user) {
      logger.warn('Employee login failed', {
        last5,
        error: authError?.message,
        ip: clientIP,
        userAgent
      })
      
      return sendUniformResponse({
        success: false,
        error: 'Credenciales inválidas'
      })
    }

    // Extract employee ID from user metadata
    const employeeId = authData.user.user_metadata?.employee_id
    if (!employeeId) {
      logger.error('Employee ID not found in user metadata', {
        userId: authData.user.id,
        metadata: authData.user.user_metadata
      })
      
      return sendUniformResponse({
        success: false,
        error: 'Datos de empleado no encontrados'
      })
    }

    // Fetch full employee data using RLS (user is now authenticated)
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select(`
        id, 
        name, 
        dni, 
        role,
        departments!inner(name)
      `)
      .eq('id', employeeId)
      .single()

    if (employeeError || !employee) {
      logger.error('Employee data fetch failed', {
        employeeId,
        error: employeeError
      })
      
      return sendUniformResponse({
        success: false,
        error: 'Empleado no encontrado'
      })
    }

    // Success logging
    logger.info('Employee login successful', {
      employeeId: employee.id,
      employeeName: employee.name,
      clientIP,
      userAgent,
      authMethod: 'supabase_auth'
    })

    // Return success with Supabase session
    return sendUniformResponse({
      success: true,
      sessionToken: authData.session?.access_token || 'supabase_managed',
      employee: {
        id: employee.id,
        name: employee.name,
        dni_masked: employee.dni.replace(/\d(?=\d{5})/g, '*'),
        role: employee.role || 'Empleado',
        department: employee.departments?.name
      },
      expiresAt: authData.session?.expires_at
    }, 200)

  } catch (error) {
    logger.error('Employee login error', error)
    return sendUniformResponse({
      success: false,
      error: 'Error interno del servidor'
    }, 500)
  }
}
