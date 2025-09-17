import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../../lib/supabase/server'
import { logger } from '../../../../lib/logger'
import { otpStore } from './send-otp'

interface VerifyOtpRequest {
  email: string
  code: string
}

interface VerifyOtpResponse {
  success: boolean
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

export default async function handler(req: NextApiRequest, res: NextApiResponse<VerifyOtpResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    })
  }

  try {
    const { email, code }: VerifyOtpRequest = req.body

    // Input validation
    if (!email || !code || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email o código inválido' 
      })
    }

    // Verify OTP from store
    const storedOtp = otpStore.get(email)
    
    if (!storedOtp) {
      return res.status(401).json({
        success: false,
        error: 'Código no encontrado o expirado'
      })
    }

    if (storedOtp.expires < Date.now()) {
      otpStore.delete(email)
      return res.status(401).json({
        success: false,
        error: 'Código expirado'
      })
    }

    if (storedOtp.code !== code) {
      logger.warn('Invalid OTP attempt', {
        email,
        ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
      })
      
      return res.status(401).json({
        success: false,
        error: 'Código inválido'
      })
    }

    // OTP verified successfully, clear from store
    otpStore.delete(email)

    const supabase = createClient(req, res)

    // Get employee data
    const { data: employee, error: employeeError } = await supabase
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

    // Create a custom session using Supabase Auth
    // Since we can't create auth.users directly, we'll create a custom session
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
    logger.error('Verify OTP error', error)
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    })
  }
}
