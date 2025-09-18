import { NextApiRequest, NextApiResponse } from 'next'
import { createClient, createAdminClient } from '../../../../lib/supabase/server'
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
    
    // Step 1: Send OTP (if no code provided) - USAR CUSTOM OTP PARA NO JODER MAGIC LINKS
    if (!code) {
      // Verificar que el empleado existe y obtener sus datos
      const adminSupabase = createAdminClient()
      const { data: employee, error: employeeError } = await adminSupabase
        .from('employees')
        .select('id, name, email, company_id')
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

      // Usar el sistema OTP anterior que YA FUNCIONABA
      const { sendOtp } = await import('../../../../lib/employee-otp')
      const otpResult = await sendOtp(email, employee.id, employee.name)
      
      return res.status(otpResult.success ? 200 : 500).json({
        success: otpResult.success,
        step: 'send_code',
        message: otpResult.message,
        error: otpResult.error
      })
    }

    // Step 2: Verify OTP - USAR CUSTOM VERIFICATION + SUPABASE SESSION
    const { verifyOtp } = await import('../../../../lib/employee-otp')
    const otpVerification = verifyOtp(email, code)
    
    if (!otpVerification.success) {
      return res.status(401).json({
        success: false,
        error: otpVerification.error
      })
    }

    // OTP válido, buscar usuario en auth.users por email
    const adminSupabase = createAdminClient()
    const { data: authUsers, error: listError } = await adminSupabase.auth.admin.listUsers()
    
    if (listError) {
      logger.error('Failed to list users', listError)
      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      })
    }

    const existingUser = authUsers.users.find(user => user.email === email)
    
    if (!existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Usuario no encontrado en auth'
      })
    }

    // Crear sesión manual usando signInWithPassword con password temporal
    const tempPassword = `temp_${existingUser.user_metadata?.employee_id}_login`
    
    try {
      // Primero actualizar password temporalmente
      await adminSupabase.auth.admin.updateUserById(existingUser.id, {
        password: tempPassword
      })

      // Luego hacer sign in para crear sesión
      const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
        email: email,
        password: tempPassword
      })

      if (sessionError || !sessionData.session) {
        logger.error('Failed to create session', sessionError)
        return res.status(500).json({
          success: false,
          error: 'Error creando sesión'
        })
      }

      // Get employee data from user metadata
      const employeeId = existingUser.user_metadata?.employee_id
      const employeeName = existingUser.user_metadata?.full_name
      const companyId = existingUser.user_metadata?.company_id

      logger.info('Employee login successful via Custom OTP + Supabase Session', {
        employeeId,
        employeeName,
        email,
        userId: existingUser.id
      })

      return res.status(200).json({
        success: true,
        step: 'verify_code',
        user: sessionData.user,
        session: sessionData.session,
        employee: {
          id: employeeId,
          name: employeeName,
          dni_masked: 'Protected',
          role: 'Empleado',
          department: 'N/A'
        }
      })

    } catch (sessionError) {
      logger.error('Session creation error', sessionError)
      return res.status(500).json({
        success: false,
        error: 'Error creando sesión'
      })
    }

  } catch (error) {
    logger.error('Employee login error', error)
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    })
  }
}
