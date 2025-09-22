import { NextApiRequest, NextApiResponse } from 'next'
import { createServerSupabaseClient, createServiceRoleClient } from '../../../../lib/supabase/server'
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

    const supabase = createServerSupabaseClient()
    const adminSupabase = createServiceRoleClient()
    
    // Step 1: Send OTP (if no code provided)
    if (!code) {
      // Verificar que el empleado existe
      const { data: employee, error: employeeError } = await adminSupabase
        .from('employees')
        .select('id, name, email, company_id, dni')
        .eq('email', email)
        .eq('company_id', '00000000-0000-0000-0000-000000000001')
        .eq('status', 'active')
        .single()

      if (employeeError || !employee) {
        logger.warn('Employee not found', { email, error: employeeError?.message })
        return res.status(400).json({
          success: false,
          error: 'Email no encontrado o empleado inactivo'
        })
      }

      // Enviar OTP usando el sistema que ya funcionaba
      const otpResult = await sendOtp(email, employee.id, employee.name)
      
      return res.status(otpResult.success ? 200 : 500).json({
        success: otpResult.success,
        step: 'send_code',
        message: otpResult.message,
        error: otpResult.error
      })
    }

    // Step 2: Verify OTP y crear sesión Supabase estándar
    const otpVerification = verifyOtp(email, code)
    
    if (!otpVerification.success) {
      return res.status(401).json({
        success: false,
        error: otpVerification.error
      })
    }

    // OTP válido, obtener datos del empleado
    const { data: employee, error: employeeError } = await adminSupabase
      .from('employees')
      .select('id, name, email, company_id, role, dni, departments:department_id(name)')
      .eq('email', email)
      .eq('company_id', '00000000-0000-0000-0000-000000000001')
      .eq('status', 'active')
      .single()

    if (employeeError || !employee) {
      logger.error('Employee not found after OTP verification', { email, error: employeeError })
      return res.status(404).json({
        success: false,
        error: 'Empleado no encontrado'
      })
    }

    // Crear sesión Supabase estándar usando password determinista
    const deterministic_password = `emp_${employee.id.toString().substring(0, 8)}_paragon`
    
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email,
      password: deterministic_password
    })

    if (authError || !authData.user) {
      logger.error('Failed to create Supabase session', { 
        email, 
        error: authError,
        hint: 'User might not exist in auth.users or password mismatch'
      })
      return res.status(500).json({
        success: false,
        error: 'Error creando sesión de autenticación'
      })
    }

    logger.info('Employee login successful via OTP + Supabase Auth', {
      employeeId: employee.id,
      employeeName: employee.name,
      email: email,
      supabaseUserId: authData.user.id
    })

    return res.status(200).json({
      success: true,
      step: 'verify_code',
      user: authData.user,
      session: authData.session,
      employee: {
        id: employee.id,
        name: employee.name,
        dni_masked: employee.dni ? employee.dni.replace(/\d(?=\d{5})/g, '*') : 'N/A',
        role: employee.role || 'Empleado',
        department: (employee.departments as any)?.name || 'N/A'
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
