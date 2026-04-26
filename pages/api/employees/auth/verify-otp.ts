import { NextApiRequest, NextApiResponse } from 'next'
import { createClient, createAdminClient } from '../../../../lib/supabase/server'
import { logger } from '../../../../lib/logger'
import { verifyOtp } from '../../../../lib/employee-otp'
import { EMPLOYEE_OTP_VERIFY_NEUTRAL_ERROR } from '../../../../lib/auth/public-auth-messages'
import { enforceAuthRateLimits } from '../../../../lib/security/rate-limiting'

interface VerifyOtpRequest {
  email: string
  code: string
}

interface VerifyOtpResponse {
  success: boolean
  message?: string
  error?: string
  sessionData?: any
  session?: any
  user?: any
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

    // Validación de entrada
    if (!email || !code) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email y código son requeridos' 
      })
    }

    if (!/^[0-9]{6}$/.test(code)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Código debe ser de 6 dígitos' 
      })
    }

    if (!enforceAuthRateLimits(req, res, 'auth_otp_verify', email)) {
      return
    }

    const adminSupabase = createAdminClient()
    
    // Verificar que el empleado existe - usar maybeSingle para evitar errores de múltiples filas
    const { data: employee, error: employeeError } = await adminSupabase
      .from('employees')
      .select('id, name, email, status, company_id')
      .eq('email', email)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (employeeError) {
      logger.error('Error querying employee for OTP verification', { email, error: employeeError?.message })
      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor al buscar empleado'
      })
    }

    if (!employee) {
      logger.warn('Employee not found for OTP verification (neutral error)')
      return res.status(400).json({
        success: false,
        error: EMPLOYEE_OTP_VERIFY_NEUTRAL_ERROR
      })
    }

    // Verificar OTP
    const otpResult = await verifyOtp(email, code)
    
    if (!otpResult.success) {
      logger.warn('OTP verification failed for password recovery', { email, error: otpResult.error })
      return res.status(400).json({
        success: false,
        error: otpResult.error || 'Código inválido o expirado'
      })
    }

    // Buscar o crear usuario en auth.users
    let authUserId: string | null = null
    
    // Crear usuario en auth.users usando Admin API
    // Nota: Saltamos la verificación de usuarios existentes por problemas con la API de admin
    // La verificación se hará en el momento de crear el usuario
    const deterministic_password = `emp_${employee.id.toString().substring(0, 8)}_paragon`
    
    const { data: newUser, error: createUserError } = await adminSupabase.auth.admin.createUser({
      email: email,
      password: deterministic_password,
      email_confirm: true,
      user_metadata: {
        employee_id: employee.id,
        company_id: employee.company_id,
        full_name: employee.name,
        role: 'employee',
        is_employee_portal: true
      }
    })
    
    if (createUserError || !newUser.user) {
      logger.error('Failed to create auth user via OTP recovery', { 
        email, 
        error: createUserError,
        employeeId: employee.id
      })
      
      // Manejar errores específicos
      if (createUserError?.message?.includes('already been registered')) {
        // Usuario ya existe, intentar login directo
        logger.info('User already exists, attempting direct login', { email })
      } else {
        return res.status(500).json({
          success: false,
          error: `Error creando usuario de autenticación: ${createUserError?.message || 'Error desconocido'}`
        })
      }
    } else {
      authUserId = newUser.user.id
    }

    // Crear sesión con el cliente que maneja cookies
    const supabase = createClient(req, res)
    
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email,
      password: deterministic_password
    })

    if (authError || !authData.user) {
      logger.error('Failed to create session via OTP recovery', { 
        email, 
        error: authError?.message,
        employeeId: employee.id
      })
      return res.status(500).json({
        success: false,
        error: 'Error creando sesión de autenticación'
      })
    }

    // Verificar si existe user_profile, si no, crearlo
    const { data: existingProfile } = await adminSupabase
      .from('user_profiles')
      .select('id')
      .eq('id', authUserId)
      .single()
    
    if (!existingProfile) {
      const { error: profileError } = await adminSupabase
        .from('user_profiles')
        .insert({
          id: authUserId,
          email: email,
          role: 'employee',
          company_id: employee.company_id,
          employee_id: employee.id,
          permissions: {
            dashboard: true,
            employees: false,
            departments: false,
            attendance: true,
            leave: true,
            payroll: true,
            reports: false,
            gamification: false,
            settings: false
          }
        })
      
      if (profileError) {
        logger.warn('Failed to create user profile via OTP recovery', { 
          userId: authUserId, 
          error: profileError 
        })
      }
    }

    logger.info('Employee login successful via OTP recovery', {
      email,
      employeeId: employee.id,
      supabaseUserId: authData.user.id
    })

    return res.status(200).json({
      success: true,
      message: 'Acceso recuperado exitosamente',
      session: authData.session,
      user: authData.user,
      sessionData: {
        user: authData.user,
        session: authData.session
      }
    })

  } catch (error) {
    logger.error('Verify OTP for recovery error', error)
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    })
  }
}