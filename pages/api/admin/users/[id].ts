import { createClient as createSupabaseJsClient } from '@supabase/supabase-js'
import { NextApiRequest, NextApiResponse } from 'next'
import { createClient, createAdminClient } from '../../../../lib/supabase/server'
import { logger } from '../../../../lib/logger'
import { createSecureErrorResponse, createAuthErrorResponse } from '../../../../lib/security/error-handling'
import { env } from '../../../../lib/env'
import { logSuperAdminAction } from '../../../../lib/security/audit-logger'
import { validateAdminPassword } from '../../../../lib/auth/password-policy'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = createClient(req, res)
    const { id } = req.query

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'User ID is required' })
    }
    
    // Get user and verify super admin role
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return res.status(401).json(createAuthErrorResponse('Authentication required'))
    }

    // Check if user is super admin
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'super_admin') {
      return res.status(403).json(createAuthErrorResponse('Super admin access required'))
    }

    switch (req.method) {
      case 'GET':
        return await getUser(supabase, id, res)
      case 'PATCH':
        return await updateUser(supabase, id, req, res)
      case 'POST':
        return await postActions(supabase, id, req, res, user.id)
      case 'DELETE':
        return await deleteUser(supabase, id, res)
      default:
        res.setHeader('Allow', ['GET', 'PATCH', 'POST', 'DELETE'])
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    logger.error('Error in user admin API', error)
    return res.status(500).json(createSecureErrorResponse(error))
  }
}

async function getUser(supabase: any, id: string, res: NextApiResponse) {
  try {
    // Use admin client to bypass RLS
    const adminClient = createAdminClient()
    
    const { data: userProfile, error } = await adminClient
      .from('user_profiles')
      .select(`
        id,
        role,
        is_active,
        permissions,
        last_login,
        created_at,
        updated_at,
        company_id,
        employee_id,
        companies:companies(name, subdomain),
        employees(name, email)
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'User not found' })
      }
      throw error
    }

    let authUser: { email?: string | null; last_sign_in_at?: string | null } | null = null
    try {
      const { data: authData, error: authErr } = await adminClient.auth.admin.getUserById(id)
      if (!authErr && authData?.user) {
        authUser = {
          email: authData.user.email,
          last_sign_in_at: authData.user.last_sign_in_at ?? null
        }
      }
    } catch (authError: any) {
      logger.warn('Error fetching auth user', { userId: id, error: authError?.message || String(authError) })
    }

    // Transform data
    const companies = userProfile.companies as any
    const companyName = companies 
      ? (Array.isArray(companies) ? companies[0]?.name : companies.name)
      : null
    const companySubdomain = companies
      ? (Array.isArray(companies) ? companies[0]?.subdomain : companies.subdomain)
      : null
    
    const employee = userProfile.employees as any
    const employeeName = employee 
      ? (Array.isArray(employee) ? employee[0]?.name : employee.name)
      : null
    const employeeEmail = employee 
      ? (Array.isArray(employee) ? employee[0]?.email : employee.email)
      : null

    const userData = {
      id: userProfile.id,
      email: authUser?.email || employeeEmail || '',
      name: employeeName,
      role: userProfile.role,
      is_active: userProfile.is_active,
      permissions: userProfile.permissions,
      last_login: userProfile.last_login || authUser?.last_sign_in_at,
      created_at: userProfile.created_at,
      updated_at: userProfile.updated_at,
      company: {
        id: userProfile.company_id,
        name: companyName,
        subdomain: companySubdomain
      },
      employee: userProfile.employee_id ? {
        id: userProfile.employee_id,
        name: employeeName,
        email: employeeEmail
      } : null
    }

    return res.status(200).json({
      success: true,
      user: userData
    })
  } catch (error) {
    logger.error('Error fetching user', error)
    return res.status(500).json(createSecureErrorResponse(error))
  }
}

async function updateUser(supabase: any, id: string, req: NextApiRequest, res: NextApiResponse) {
  try {
    const { role, is_active, permissions, company_id } = req.body

    // Use admin client to bypass RLS
    const adminClient = createAdminClient()

    // Build update object with only provided fields
    const updateData: any = {}
    if (role !== undefined) {
      const validRoles = ['super_admin', 'company_admin', 'hr_manager', 'manager', 'employee']
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          error: 'Invalid role',
          message: `Role must be one of: ${validRoles.join(', ')}`
        })
      }
      updateData.role = role
    }
    if (is_active !== undefined) updateData.is_active = is_active
    if (permissions !== undefined) updateData.permissions = permissions
    if (company_id !== undefined) {
      // Verify company exists
      const { data: company, error: companyError } = await adminClient
        .from('companies')
        .select('id, is_active')
        .eq('id', company_id)
        .single()

      if (companyError || !company) {
        return res.status(404).json({
          error: 'Company not found',
          message: 'The specified company does not exist'
        })
      }

      if (!company.is_active) {
        return res.status(400).json({
          error: 'Company inactive',
          message: 'Cannot assign users to inactive companies'
        })
      }

      updateData.company_id = company_id
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        error: 'No fields to update',
        message: 'At least one field must be provided'
      })
    }

    // Check if user exists
    const { data: existingUser, error: existingError } = await adminClient
      .from('user_profiles')
      .select('id, role')
      .eq('id', id)
      .single()

    if (existingError || !existingUser) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Prevent demoting the last super admin
    if (existingUser.role === 'super_admin' && role && role !== 'super_admin') {
      const { data: superAdmins, error: superAdminError } = await adminClient
        .from('user_profiles')
        .select('id')
        .eq('role', 'super_admin')
        .eq('is_active', true)

      if (superAdminError) {
        throw superAdminError
      }

      if (superAdmins.length <= 1) {
        return res.status(409).json({
          error: 'Cannot demote last super admin',
          message: 'There must be at least one active super admin in the system'
        })
      }
    }

    const { data: updatedUser, error } = await adminClient
      .from('user_profiles')
      .update(updateData)
      .eq('id', id)
      .select(`
        id,
        role,
        is_active,
        permissions,
        company_id,
        companies:companies(name)
      `)
      .single()

    if (error) {
      throw error
    }

    logger.info('User updated successfully', {
      userId: id,
      updatedFields: Object.keys(updateData)
    })

    return res.status(200).json({
      success: true,
      message: 'User updated successfully',
      user: updatedUser
    })
  } catch (error) {
    logger.error('Error updating user', error)
    return res.status(500).json(createSecureErrorResponse(error))
  }
}

async function deleteUser(supabase: any, id: string, res: NextApiResponse) {
  try {
    // Use admin client to bypass RLS
    const adminClient = createAdminClient()
    
    // Check if user exists and get role
    const { data: userProfile, error: userError } = await adminClient
      .from('user_profiles')
      .select('id, role')
      .eq('id', id)
      .single()

    if (userError || !userProfile) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Prevent deleting the last super admin
    if (userProfile.role === 'super_admin') {
      const { data: superAdmins, error: superAdminError } = await adminClient
        .from('user_profiles')
        .select('id')
        .eq('role', 'super_admin')
        .eq('is_active', true)

      if (superAdminError) {
        throw superAdminError
      }

      if (superAdmins.length <= 1) {
        return res.status(409).json({
          error: 'Cannot delete last super admin',
          message: 'There must be at least one active super admin in the system'
        })
      }
    }

    // Delete user profile first (will cascade due to foreign key)
    const { error: profileError } = await adminClient
      .from('user_profiles')
      .delete()
      .eq('id', id)

    if (profileError) {
      throw profileError
    }

    // Delete from Supabase Auth
    const { error: authError } = await adminClient.auth.admin.deleteUser(id)
    
    if (authError) {
      logger.warn('Failed to delete user from auth, but profile deleted', {
        userId: id,
        error: authError
      })
    }

    logger.info('User deleted successfully', { userId: id })

    return res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    })
  } catch (error) {
    logger.error('Error deleting user', error)
    return res.status(500).json(createSecureErrorResponse(error))
  }
}

async function postActions(
  supabase: any,
  id: string,
  req: NextApiRequest,
  res: NextApiResponse,
  actorUserId: string
) {
  try {
    const action = (req.query.action as string) || ''
    if (action === 'send-recovery-link') {
      if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        return res.status(503).json({
          error: 'Service unavailable',
          message: 'Recuperación por correo no está configurada (Supabase URL/anon key).'
        })
      }

      const adminClient = createAdminClient()
      const { data: authRow, error: getUserError } = await adminClient.auth.admin.getUserById(id)
      if (getUserError || !authRow?.user?.email) {
        return res.status(404).json({
          error: 'User not found',
          message: 'No se encontró el usuario o no tiene correo en Auth'
        })
      }

      const siteUrl = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
      const redirectTo = `${siteUrl}/auth/update-password?next=${encodeURIComponent('/app/login')}`

      const pub = createSupabaseJsClient(
        env.NEXT_PUBLIC_SUPABASE_URL,
        env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        { auth: { persistSession: false, autoRefreshToken: false } }
      )

      const { error: resetErr } = await pub.auth.resetPasswordForEmail(authRow.user.email, {
        redirectTo
      })

      if (resetErr) {
        logger.warn('send-recovery-link: resetPasswordForEmail error (still returning success to client)', {
          userId: id,
          message: resetErr.message
        })
      }

      await logSuperAdminAction(actorUserId, 'user_recovery_email_sent', 'user', id, {})

      return res.status(200).json({
        success: true,
        message: 'Si el servicio de correo está activo, el usuario recibirá un enlace para restablecer la contraseña.'
      })
    }

    if (action === 'reset-password') {
      // Require SERVICE_ROLE_KEY - auth.admin.updateUserById only works with it
      if (!env.SUPABASE_SERVICE_ROLE_KEY) {
        logger.error('Password reset failed: SUPABASE_SERVICE_ROLE_KEY not configured')
        return res.status(503).json({
          error: 'Service unavailable',
          message: 'El reseteo de contraseña no está configurado correctamente. Contacte al administrador.'
        })
      }

      const body = req.body as { new_password?: string } | undefined
      const new_password = body?.new_password
      const pwCheck = validateAdminPassword(new_password)
      if (!pwCheck.ok) {
        return res.status(400).json({
          error: 'Weak password',
          message: pwCheck.message
        })
      }

      const adminClient = createAdminClient()

      // Verify user exists in auth.users before attempting update
      const { data: authUser, error: getUserError } = await adminClient.auth.admin.getUserById(id)
      if (getUserError || !authUser?.user) {
        logger.error('Password reset failed: user not found in auth', { userId: id, error: getUserError })
        return res.status(404).json({
          error: 'User not found',
          message: 'El usuario no existe en el sistema de autenticación'
        })
      }

      const { error } = await adminClient.auth.admin.updateUserById(id, {
        password: new_password
      })

      if (error) {
        logger.error('Error resetting password', { userId: id, error })
        return res.status(400).json({
          error: 'Password update failed',
          message: 'No se pudo actualizar la contraseña. Intenta de nuevo o contacta soporte.'
        })
      }

      await logSuperAdminAction(actorUserId, 'user_password_reset_by_admin', 'user', id, {})

      logger.info('Password reset successfully', { userId: id, actorUserId })
      return res.status(200).json({
        success: true,
        message: 'Password reset successfully',
        user: { id }
      })
    }
    return res.status(400).json({ error: 'Unknown action' })
  } catch (error: any) {
    logger.error('Error in postActions', { action: req.query.action, error })
    return res.status(500).json(createSecureErrorResponse(error))
  }
}
