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
    
    // Step 1: Send OTP code to email (if no code provided)
    if (!code) {
      // First verify the email belongs to an active employee
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('id, name, email, company_id')
        .eq('email', email)
        .eq('company_id', '00000000-0000-0000-0000-000000000001') // Paragon
        .eq('status', 'active')
        .single()

      if (employeeError || !employee) {
        logger.warn('Employee email not found', {
          email,
          error: employeeError?.message
        })
        
        return res.status(401).json({
          success: false,
          error: 'Email no encontrado o empleado inactivo'
        })
      }

      // Send OTP using Supabase Auth
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          shouldCreateUser: false, // Don't create user if doesn't exist
          data: {
            employee_id: employee.id,
            company_id: employee.company_id,
            full_name: employee.name,
            is_employee_portal: true
          }
        }
      })

      if (otpError) {
        logger.error('OTP send failed', {
          email,
          error: otpError.message
        })
        
        return res.status(500).json({
          success: false,
          error: 'Error enviando código. Intente nuevamente.'
        })
      }

      logger.info('OTP code sent to employee', {
        employeeId: employee.id,
        email: email
      })

      return res.status(200).json({
        success: true,
        step: 'send_code',
        message: 'Código enviado a su email. Revise su bandeja de entrada.'
      })
    }

    // Step 2: Verify OTP code
    const { data, error } = await supabase.auth.verifyOtp({
      email: email,
      token: code,
      type: 'email'
    })

    if (error || !data.user) {
      logger.warn('OTP verification failed', {
        email,
        error: error?.message,
        ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
      })
      
      return res.status(401).json({
        success: false,
        error: 'Código inválido o expirado'
      })
    }

    // Get employee data from user metadata or database
    let employeeId = data.user.user_metadata?.employee_id
    
    // If not in metadata, fetch from database by email
    if (!employeeId) {
      const { data: employee } = await supabase
        .from('employees')
        .select('id')
        .eq('email', email)
        .eq('company_id', '00000000-0000-0000-0000-000000000001')
        .eq('status', 'active')
        .single()
      
      employeeId = employee?.id
    }

    if (!employeeId) {
      return res.status(401).json({
        success: false,
        error: 'Datos de empleado no encontrados'
      })
    }

    // Fetch employee details
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select(`
        id, 
        name, 
        dni, 
        role,
        departments:department_id(name)
      `)
      .eq('id', employeeId)
      .single()

    if (employeeError || !employee) {
      logger.error('Employee data fetch failed', {
        employeeId,
        error: employeeError
      })
      
      return res.status(404).json({
        success: false,
        error: 'Empleado no encontrado'
      })
    }

    logger.info('Employee login successful via OTP', {
      employeeId: employee.id,
      employeeName: employee.name,
      email: email,
      method: 'supabase_otp'
    })

    return res.status(200).json({
      success: true,
      step: 'verify_code',
      user: data.user,
      session: data.session,
      employee: {
        id: employee.id,
        name: employee.name,
        dni_masked: employee.dni ? employee.dni.replace(/\d(?=\d{5})/g, '*') : 'N/A',
        role: employee.role || 'Empleado',
        department: (employee.departments as any)?.name
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
