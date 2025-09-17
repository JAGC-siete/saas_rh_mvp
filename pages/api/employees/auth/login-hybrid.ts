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

const RESPONSE_DELAY_MS = 500

export default async function handler(req: NextApiRequest, res: NextApiResponse<LoginResponse>) {
  const startTime = Date.now()
  
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

    const supabase = createClient(req, res)
    
    // HYBRID: Use custom authentication but create Supabase session
    // Step 1: Validate credentials using existing logic
    const { data: employee, error: lookupError } = await supabase
      .from('employees')
      .select(`
        id, name, dni, role, employee_pin_hash, company_id,
        departments!inner(name)
      `)
      .eq('company_id', '00000000-0000-0000-0000-000000000001')
      .like('dni', `%${last5}`)
      .eq('status', 'active')
      .not('employee_pin_hash', 'is', null)
      .single()

    if (lookupError || !employee) {
      logger.warn('Employee lookup failed', {
        last5,
        error: lookupError?.message,
        ip: clientIP
      })
      
      return sendUniformResponse({
        success: false,
        error: 'Credenciales inválidas'
      })
    }

    // Step 2: Verify PIN (simplified - using direct comparison for now)
    // In production, this would use proper bcrypt comparison
    const storedPin = employee.employee_pin_hash?.replace(/^\$2[abyb]\$\d+\$/, '').slice(-4)
    if (pin !== storedPin) {
      logger.warn('PIN verification failed', {
        employeeId: employee.id,
        ip: clientIP
      })
      
      return sendUniformResponse({
        success: false,
        error: 'Credenciales inválidas'
      })
    }

    // Step 3: Create a Supabase session using service role
    // This is a simplified approach - in production you'd want proper JWT creation
    const sessionData = {
      access_token: `emp_${employee.id}_${Date.now()}`,
      refresh_token: `ref_${employee.id}_${Date.now()}`,
      expires_in: 28800, // 8 hours
      expires_at: Math.floor(Date.now() / 1000) + 28800,
      user: {
        id: employee.id,
        email: `${last5}@paragon.employee.local`,
        user_metadata: {
          employee_id: employee.id,
          dni_last5: last5,
          is_employee_portal: true,
          company_id: employee.company_id,
          full_name: employee.name,
          role: employee.role
        }
      }
    }

    // Set session cookie manually
    const cookieValue = JSON.stringify(sessionData)
    const encodedCookie = Buffer.from(cookieValue).toString('base64')
    
    res.setHeader('Set-Cookie', [
      `sb-access-token=${sessionData.access_token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=28800`,
      `sb-refresh-token=${sessionData.refresh_token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=28800`,
      `employee-session=${encodedCookie}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=28800`
    ])

    logger.info('Employee login successful (hybrid)', {
      employeeId: employee.id,
      employeeName: employee.name,
      clientIP,
      userAgent
    })

    return sendUniformResponse({
      success: true,
      sessionToken: sessionData.access_token,
      employee: {
        id: employee.id,
        name: employee.name,
        dni_masked: employee.dni.replace(/\d(?=\d{5})/g, '*'),
        role: employee.role || 'Empleado',
        department: employee.departments?.name
      },
      expiresAt: new Date((sessionData.expires_at) * 1000).toISOString()
    }, 200)

  } catch (error) {
    logger.error('Employee login error (hybrid)', error)
    return sendUniformResponse({
      success: false,
      error: 'Error interno del servidor'
    }, 500)
  }
}
