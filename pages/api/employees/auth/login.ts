import { NextApiRequest, NextApiResponse } from 'next'
import { createClient, createAdminClient } from '../../../../lib/supabase/server'
import { logger } from '../../../../lib/logger'
import { sendOtp, verifyOtp } from '../../../../lib/employee-otp'
import { createSessionOnLogin } from '../../../../lib/middleware/session-manager'
import {
  EMPLOYEE_OTP_SEND_NEUTRAL_MESSAGE,
  EMPLOYEE_OTP_VERIFY_NEUTRAL_ERROR
} from '../../../../lib/auth/public-auth-messages'

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
    const adminSupabase = createAdminClient()
    
    // Step 1: Send OTP (if no code provided)
    if (!code) {
      // Verificar que el empleado existe (sin filtrar por company_id para permitir cualquier empresa)
      const { data: employee, error: employeeError } = await adminSupabase
        .from('employees')
        .select('id, name, email, company_id, dni')
        .eq('email', email)
        .eq('status', 'active')
        .single()

      if (employeeError || !employee) {
        logger.warn('Employee OTP request: no active match (neutral response)', {
          error: employeeError?.message
        })
        return res.status(200).json({
          success: true,
          step: 'send_code',
          message: EMPLOYEE_OTP_SEND_NEUTRAL_MESSAGE
        })
      }

      const otpResult = await sendOtp(email, employee.id, employee.name)

      if (!otpResult.success) {
        logger.error('Failed to send employee OTP', { error: otpResult.error })
        return res.status(500).json({
          success: false,
          error: 'No se pudo enviar el código. Intenta más tarde.',
          step: 'send_code'
        })
      }

      return res.status(200).json({
        success: true,
        step: 'send_code',
        message: EMPLOYEE_OTP_SEND_NEUTRAL_MESSAGE
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
      .eq('status', 'active')
      .single()

    if (employeeError || !employee) {
      logger.error('Employee not found after OTP verification', { error: employeeError?.message })
      return res.status(400).json({
        success: false,
        error: EMPLOYEE_OTP_VERIFY_NEUTRAL_ERROR
      })
    }

    // Buscar o crear usuario en auth.users
    let authUserId: string | null = null
    
    // Primero intentar buscar si ya existe un usuario de Supabase Auth con este email
    const { data: existingAuthUsers } = await adminSupabase.auth.admin.listUsers()
    const existingAuthUser = existingAuthUsers?.users?.find((u: any) => u.email === email)
    
    if (existingAuthUser) {
      authUserId = existingAuthUser.id
      
      // Actualizar user_metadata si no tiene employee_id
      if (!existingAuthUser.user_metadata?.employee_id) {
        await adminSupabase.auth.admin.updateUserById(authUserId, {
          user_metadata: {
            ...existingAuthUser.user_metadata,
            employee_id: employee.id,
            company_id: employee.company_id,
            full_name: employee.name,
            role: 'employee',
            is_employee_portal: true
          }
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
          logger.warn('Failed to create user profile for existing user', { 
            userId: authUserId, 
            error: profileError 
          })
        }
      }
    } else {
      // Crear usuario en auth.users usando Admin API
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
        logger.error('Failed to create auth user', { 
          email, 
          error: createUserError,
          employeeId: employee.id
        })
        return res.status(500).json({
          success: false,
          error: 'Error creando usuario de autenticación'
        })
      }
      
      authUserId = newUser.user.id
      
      // Crear entrada en user_profiles
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
        logger.warn('Failed to create user profile', { 
          userId: authUserId, 
          error: profileError 
        })
      }
    }
    
    // Ahora crear sesión con el cliente que maneja cookies
    const deterministic_password = `emp_${employee.id.toString().substring(0, 8)}_paragon`
    
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email,
      password: deterministic_password
    })

    if (authError || !authData.user) {
      logger.error('Failed to create Supabase session', { 
        email, 
        error: authError,
        authUserId
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

    // CRITICAL: Create session in user_sessions table for idle timeout tracking
    const sessionResult = await createSessionOnLogin(
      req,
      res,
      authData.user.id,
      authData.session,
      employee.company_id
    )

    if (!sessionResult.success) {
      logger.warn('Failed to create session record for employee', {
        userId: authData.user.id,
        employeeId: employee.id
      })
      // Continue anyway - don't block login, but idle timeout won't work
    }

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
