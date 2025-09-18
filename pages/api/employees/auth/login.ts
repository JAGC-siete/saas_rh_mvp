import { NextApiRequest, NextApiResponse } from 'next'
import { createClient, createAdminClient } from '../../../../lib/supabase/server'
import { logger } from '../../../../lib/logger'
import { sendOtp, verifyOtp } from '../../../../lib/employee-otp'

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

    // Use admin client for employee lookup (no authentication required yet)
    const adminSupabase = createAdminClient()
    // Use regular client for session management
    const supabase = createClient(req, res)
    
    // Step 1: Send OTP code to email (if no code provided)
    if (!code) {
      // Verify the email belongs to an active employee
      const { data: employee, error: employeeError } = await adminSupabase
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

      // Send OTP using direct function call
      const otpResult = await sendOtp(email, employee.id, employee.name)
      
      return res.status(otpResult.success ? 200 : 500).json({
        success: otpResult.success,
        step: 'send_code',
        message: otpResult.message,
        error: otpResult.error
      })
    }

    // Step 2: Verify OTP code
    const otpVerification = verifyOtp(email, code)
    
    if (!otpVerification.success) {
      return res.status(401).json({
        success: false,
        error: otpVerification.error
      })
    }

    // Get employee data after successful OTP verification
    const { data: employee, error: employeeError } = await adminSupabase
      .from('employees')
      .select(`
        id, 
        name, 
        dni, 
        role,
        company_id,
        departments:department_id(name)
      `)
      .eq('email', email)
      .eq('company_id', '00000000-0000-0000-0000-000000000001')
      .eq('status', 'active')
      .single()

    if (employeeError || !employee) {
      logger.error('Employee data fetch failed after OTP verification', {
        email,
        error: employeeError
      })
      
      return res.status(404).json({
        success: false,
        error: 'Empleado no encontrado'
      })
    }

    // Create custom session
    const sessionData = {
      access_token: `emp_${employee.id}_${Date.now()}`,
      refresh_token: `ref_${employee.id}_${Date.now()}`,
      expires_in: 28800, // 8 hours
      expires_at: Math.floor(Date.now() / 1000) + 28800,
      user: {
        id: employee.id,
        email: email,
        user_metadata: {
          employee_id: employee.id,
          company_id: employee.company_id,
          full_name: employee.name,
          role: employee.role,
          is_employee_portal: true
        }
      }
    }

    // Set session cookies
    res.setHeader('Set-Cookie', [
      `sb-access-token=${sessionData.access_token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=28800`,
      `sb-refresh-token=${sessionData.refresh_token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=28800`,
    ])

    logger.info('Employee login successful via OTP + Resend', {
      employeeId: employee.id,
      employeeName: employee.name,
      email: email
    })

    return res.status(200).json({
      success: true,
      step: 'verify_code',
      user: sessionData.user,
      session: sessionData,
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
