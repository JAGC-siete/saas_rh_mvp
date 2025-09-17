import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../supabase/server'
import { logger } from '../logger'

export interface AuthenticatedEmployee {
  supabase: any
  employee: {
    id: string
    name: string
    dni: string
    role: string
    company_id: string
    department_id?: string
    work_schedule_id?: string
    base_salary: number
    status: string
    departments?: { name: string }
    work_schedules?: { name: string }
  }
  sessionToken: string
  companyId: string
}

/**
 * Authenticate employee using session token from employee login
 * This is separate from the main Supabase auth system
 */
export async function requireEmployeeAuth(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<AuthenticatedEmployee> {
  try {
    // Get session token from Authorization header or cookie
    const authHeader = req.headers.authorization
    const sessionToken = authHeader?.startsWith('Bearer ') 
      ? authHeader.substring(7)
      : req.cookies.employee_session_token

    if (!sessionToken) {
      res.status(401).json({ error: 'Token de sesión requerido' })
      throw new Error('EMPLOYEE_AUTH_REQUIRED')
    }

    const supabase = createAdminClient()

    // SECURE: Hash the session token and validate
    const { data: tokenHash } = await supabase
      .rpc('hash_last5', { last5: sessionToken })

    if (!tokenHash) {
      res.status(401).json({ error: 'Token inválido' })
      throw new Error('EMPLOYEE_TOKEN_HASH_FAILED')
    }

    // Validate session token hash and get employee data
    const { data: sessionData, error: sessionError } = await supabase
      .from('employee_auth_sessions')
      .select(`
        employee_id,
        expires_at,
        is_active,
        employees:employee_id (
          id,
          name,
          dni,
          role,
          company_id,
          department_id,
          work_schedule_id,
          base_salary,
          status,
          departments:department_id(name),
          work_schedules:work_schedule_id(name)
        )
      `)
      .eq('session_token_hash', tokenHash)
      .eq('is_active', true)
      .single()

    if (sessionError || !sessionData) {
      logger.warn('Invalid employee session token', { 
        hasToken: !!sessionToken,
        tokenPrefix: sessionToken?.substring(0, 8) + '...',
        error: sessionError?.message 
      })
      
      res.status(401).json({ error: 'Sesión inválida' })
      throw new Error('EMPLOYEE_SESSION_INVALID')
    }

    // Check if session is expired
    const now = new Date()
    const expiresAt = new Date(sessionData.expires_at)
    
    if (now > expiresAt) {
      logger.warn('Employee session expired', {
        employeeId: sessionData.employee_id,
        expiresAt: sessionData.expires_at
      })

      // Mark session as inactive (using hash)
      await supabase
        .from('employee_auth_sessions')
        .update({ is_active: false })
        .eq('session_token_hash', tokenHash)

      res.status(401).json({ error: 'Sesión expirada' })
      throw new Error('EMPLOYEE_SESSION_EXPIRED')
    }

    const employee = sessionData.employees as any

    // Verify employee is active and belongs to Paragon
    if (!employee || employee.status !== 'active') {
      logger.warn('Employee account inactive', {
        employeeId: sessionData.employee_id,
        status: employee?.status
      })

      res.status(403).json({ error: 'Cuenta de empleado inactiva' })
      throw new Error('EMPLOYEE_ACCOUNT_INACTIVE')
    }

    if (employee.company_id !== '00000000-0000-0000-0000-000000000001') {
      logger.warn('Employee not from Paragon company', {
        employeeId: employee.id,
        companyId: employee.company_id
      })

      res.status(403).json({ error: 'Acceso no autorizado' })
      throw new Error('EMPLOYEE_WRONG_COMPANY')
    }

    // Log successful authentication
    logger.debug('Employee authenticated successfully', {
      employeeId: employee.id,
      employeeName: employee.name,
      sessionTokenPrefix: sessionToken.substring(0, 8) + '...'
    })

    return {
      supabase,
      employee,
      sessionToken,
      companyId: employee.company_id
    }

  } catch (error) {
    if (error instanceof Error && error.message.startsWith('EMPLOYEE_')) {
      // Re-throw known authentication errors
      throw error
    }
    
    logger.error('Employee authentication unexpected error', error)
    res.status(500).json({ error: 'Error interno del servidor' })
    throw new Error('EMPLOYEE_AUTH_ERROR')
  }
}

/**
 * Logout employee by invalidating session
 */
export async function logoutEmployee(sessionToken: string): Promise<void> {
  try {
    const supabase = createAdminClient()
    
    // SECURE: Hash token before lookup
    const { data: tokenHash } = await supabase
      .rpc('hash_last5', { last5: sessionToken })

    if (tokenHash) {
      const { error } = await supabase
        .from('employee_auth_sessions')
        .update({ is_active: false })
        .eq('session_token_hash', tokenHash)

      if (error) {
        logger.error('Failed to logout employee', error)
      } else {
        logger.info('Employee logged out successfully', {
          sessionTokenPrefix: sessionToken.substring(0, 8) + '...'
        })
      }
    }
  } catch (error) {
    logger.error('Employee logout error', error)
  }
}

/**
 * Extend employee session (refresh expiration)
 */
export async function extendEmployeeSession(
  sessionToken: string,
  extensionHours: number = 8
): Promise<{ success: boolean; newExpiresAt?: string }> {
  try {
    const supabase = createAdminClient()
    const newExpiresAt = new Date(Date.now() + extensionHours * 60 * 60 * 1000)
    
    // SECURE: Hash token before lookup
    const { data: tokenHash } = await supabase
      .rpc('hash_last5', { last5: sessionToken })

    if (!tokenHash) {
      return { success: false }
    }
    
    const { error } = await supabase
      .from('employee_auth_sessions')
      .update({ expires_at: newExpiresAt.toISOString() })
      .eq('session_token_hash', tokenHash)
      .eq('is_active', true)

    if (error) {
      logger.error('Failed to extend employee session', error)
      return { success: false }
    }

    logger.debug('Employee session extended', {
      sessionTokenPrefix: sessionToken.substring(0, 8) + '...',
      newExpiresAt: newExpiresAt.toISOString()
    })

    return { 
      success: true, 
      newExpiresAt: newExpiresAt.toISOString() 
    }
  } catch (error) {
    logger.error('Employee session extension error', error)
    return { success: false }
  }
}

/**
 * Get employee session info without full authentication
 */
export async function getEmployeeSessionInfo(sessionToken: string) {
  try {
    const supabase = createAdminClient()
    
    // SECURE: Hash token before lookup
    const { data: tokenHash } = await supabase
      .rpc('hash_last5', { last5: sessionToken })

    if (!tokenHash) {
      return null
    }
    
    const { data, error } = await supabase
      .from('employee_auth_sessions')
      .select(`
        employee_id,
        expires_at,
        is_active,
        employees:employee_id(name, role)
      `)
      .eq('session_token_hash', tokenHash)
      .eq('is_active', true)
      .single()

    if (error || !data) {
      return null
    }

    const now = new Date()
    const expiresAt = new Date(data.expires_at)
    
    return {
      employeeId: data.employee_id,
      employeeName: (data.employees as any)?.name,
      employeeRole: (data.employees as any)?.role,
      expiresAt: data.expires_at,
      isExpired: now > expiresAt,
      timeRemaining: Math.max(0, expiresAt.getTime() - now.getTime())
    }
  } catch (error) {
    logger.error('Error getting employee session info', error)
    return null
  }
}
