import { createClient as createSupabaseJsClient } from '@supabase/supabase-js'
import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../../lib/supabase/server'
import { logger } from '../../../../lib/logger'
import {
  createSecureErrorResponse,
  createAuthErrorResponse,
} from '../../../../lib/security/error-handling'
import { env } from '../../../../lib/env'
import { requireAdminWithTenant } from '../../../../lib/auth/api-guards'
import { logTenantAdminAction } from '../../../../lib/security/audit-logger'
import { validateAdminPassword } from '../../../../lib/auth/password-policy'
import {
  COMPANY_MANAGED_ROLES,
  buildCompanyUserPermissions,
  isCompanyManagedRole,
  moduleGrantsFromPermissions,
  parseModuleGrantsFromBody,
  type CompanyManagedRole,
} from '../../../../lib/company/users'
import { loadCompanyEffectiveFeatures } from '../../../../lib/company/users-server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const auth = await requireAdminWithTenant(req, res, {
      allowedRoles: ['company_admin', 'hr_manager'],
    })

    if (!auth.companyId) {
      return res.status(403).json({
        error: 'Company required',
        message: 'El usuario debe pertenecer a una empresa',
      })
    }

    const { id } = req.query
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'User ID is required' })
    }

    switch (req.method) {
      case 'GET':
        return await getUser(id, auth.companyId, auth.adminClient, res)
      case 'PATCH':
        return await updateUser(id, auth.user.id, auth.companyId, auth.adminClient, req, res)
      case 'POST':
        return await postActions(id, auth.user.id, auth.companyId, auth.adminClient, req, res)
      default:
        res.setHeader('Allow', ['GET', 'PATCH', 'POST'])
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error: any) {
    if (
      error?.message === 'UNAUTHORIZED' ||
      error?.message === 'INSUFFICIENT_PERMISSIONS' ||
      error?.message === 'PROFILE_REQUIRED'
    ) {
      return
    }
    logger.error('Error in company user API', error)
    return res.status(500).json(createSecureErrorResponse(error))
  }
}

async function loadScopedProfile(
  adminClient: ReturnType<typeof createAdminClient>,
  id: string,
  companyId: string
) {
  const { data, error } = await adminClient
    .from('user_profiles')
    .select(
      `
      id,
      role,
      is_active,
      permissions,
      last_login,
      created_at,
      updated_at,
      company_id,
      employee_id,
      employees(name, email)
    `
    )
    .eq('id', id)
    .eq('company_id', companyId)
    .maybeSingle()

  if (error) throw error
  return data
}

async function getUser(
  id: string,
  companyId: string,
  adminClient: ReturnType<typeof createAdminClient>,
  res: NextApiResponse
) {
  try {
    const userProfile = await loadScopedProfile(adminClient, id, companyId)
    if (!userProfile) {
      return res.status(404).json({ error: 'User not found' })
    }

    if (userProfile.role === 'super_admin') {
      return res.status(403).json(createAuthErrorResponse('Access denied'))
    }

    let authUser: { email?: string | null; last_sign_in_at?: string | null } | null = null
    try {
      const { data: authData, error: authErr } = await adminClient.auth.admin.getUserById(id)
      if (!authErr && authData?.user) {
        authUser = {
          email: authData.user.email,
          last_sign_in_at: authData.user.last_sign_in_at ?? null,
        }
      }
    } catch (authError: any) {
      logger.warn('company user get: auth fetch failed', {
        userId: id,
        error: authError?.message || String(authError),
      })
    }

    const employee = userProfile.employees as any
    const employeeName = employee
      ? Array.isArray(employee)
        ? employee[0]?.name
        : employee.name
      : null
    const employeeEmail = employee
      ? Array.isArray(employee)
        ? employee[0]?.email
        : employee.email
      : null

    const features = await loadCompanyEffectiveFeatures(companyId)
    const module_grants = moduleGrantsFromPermissions(
      userProfile.role,
      userProfile.permissions,
      features
    )

    return res.status(200).json({
      success: true,
      user: {
        id: userProfile.id,
        email: authUser?.email || employeeEmail || '',
        name: employeeName,
        role: userProfile.role,
        is_active: userProfile.is_active,
        permissions: userProfile.permissions,
        module_grants,
        last_login: userProfile.last_login || authUser?.last_sign_in_at,
        created_at: userProfile.created_at,
        updated_at: userProfile.updated_at,
        company_id: userProfile.company_id,
        employee: userProfile.employee_id
          ? { id: userProfile.employee_id, name: employeeName, email: employeeEmail }
          : null,
      },
      features,
    })
  } catch (error) {
    logger.error('Error fetching company user', error)
    return res.status(500).json(createSecureErrorResponse(error))
  }
}

async function updateUser(
  id: string,
  actorUserId: string,
  companyId: string,
  adminClient: ReturnType<typeof createAdminClient>,
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const body = req.body || {}

    if (body.company_id !== undefined) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'No se puede cambiar company_id',
      })
    }

    if (body.role === 'super_admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'No se puede asignar el rol super_admin',
      })
    }

    const existing = await loadScopedProfile(adminClient, id, companyId)
    if (!existing) {
      // Distinguish missing vs cross-company: if exists elsewhere → 403
      const { data: other } = await adminClient
        .from('user_profiles')
        .select('id, company_id')
        .eq('id', id)
        .maybeSingle()
      if (other && other.company_id !== companyId) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'Usuario fuera del alcance de la empresa',
        })
      }
      return res.status(404).json({ error: 'User not found' })
    }

    if (existing.role === 'super_admin') {
      return res.status(403).json({ error: 'Access denied' })
    }

    const updateData: Record<string, unknown> = {}
    const nextRole: CompanyManagedRole | null =
      body.role !== undefined
        ? isCompanyManagedRole(body.role)
          ? (body.role as CompanyManagedRole)
          : null
        : null

    if (body.role !== undefined) {
      if (!nextRole) {
        return res.status(400).json({
          error: 'Invalid role',
          message: `El rol debe ser uno de: ${COMPANY_MANAGED_ROLES.join(', ')}`,
        })
      }
      if (id === actorUserId && nextRole !== existing.role) {
        return res.status(400).json({
          error: 'Invalid operation',
          message: 'No puede cambiar su propio rol',
        })
      }
      updateData.role = nextRole
    }

    if (body.is_active !== undefined) {
      if (typeof body.is_active !== 'boolean') {
        return res.status(400).json({ error: 'is_active must be boolean' })
      }
      if (id === actorUserId && body.is_active === false) {
        return res.status(400).json({
          error: 'Invalid operation',
          message: 'No puede desactivarse a sí mismo',
        })
      }
      updateData.is_active = body.is_active
    }

    const roleForPerms = (nextRole || existing.role) as CompanyManagedRole
    const moduleGrants = parseModuleGrantsFromBody(body)
    const hasSalaryToggle =
      body.can_view_salary === true || body.can_view_salary === false
    const hasPermPayload =
      moduleGrants !== undefined ||
      hasSalaryToggle ||
      (body.permissions !== undefined && typeof body.permissions === 'object')

    if (hasPermPayload) {
      const companyFeatures = await loadCompanyEffectiveFeatures(companyId)
      const existingRaw =
        existing.permissions && typeof existing.permissions === 'object'
          ? (existing.permissions as Record<string, unknown>)
          : {}

      // Reject free-form permissions that try to set can_edit_salary for non-admin roles
      if (body.permissions && typeof body.permissions === 'object') {
        const incoming = body.permissions as Record<string, unknown>
        if (
          incoming.can_edit_salary === true &&
          roleForPerms !== 'company_admin' &&
          roleForPerms !== 'hr_manager'
        ) {
          return res.status(400).json({
            error: 'Invalid permissions',
            message: 'can_edit_salary solo aplica a company_admin y hr_manager',
          })
        }
      }

      const canViewSalary = hasSalaryToggle
        ? body.can_view_salary === true
        : existingRaw.can_view_salary === true
          ? true
          : existingRaw.can_view_salary === false
            ? false
            : null

      updateData.permissions = buildCompanyUserPermissions({
        role: roleForPerms,
        moduleGrants:
          moduleGrants ||
          moduleGrantsFromPermissions(roleForPerms, existingRaw, companyFeatures),
        canViewSalary,
        companyFeatures,
        existingRaw,
      })
    } else if (nextRole && nextRole !== existing.role) {
      // Role change without explicit perms → rebuild from new role defaults
      const companyFeatures = await loadCompanyEffectiveFeatures(companyId)
      updateData.permissions = buildCompanyUserPermissions({
        role: nextRole,
        canViewSalary: null,
        companyFeatures,
      })
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        error: 'No fields to update',
        message: 'Debe indicar al menos un campo',
      })
    }

    const { data: updatedUser, error } = await adminClient
      .from('user_profiles')
      .update(updateData)
      .eq('id', id)
      .eq('company_id', companyId)
      .select('id, role, is_active, permissions, company_id')
      .single()

    if (error) throw error

    await logTenantAdminAction(
      actorUserId,
      companyId,
      'company_user_updated',
      'user',
      id,
      {
        updated_fields: Object.keys(updateData),
        previous_role: existing.role,
        next_role: updatedUser.role,
        can_view_salary:
          updatedUser.permissions &&
          typeof updatedUser.permissions === 'object' &&
          (updatedUser.permissions as any).can_view_salary === true,
        can_edit_salary:
          updatedUser.permissions &&
          typeof updatedUser.permissions === 'object' &&
          (updatedUser.permissions as any).can_edit_salary === true,
      }
    )

    return res.status(200).json({
      success: true,
      message: 'Usuario actualizado',
      user: updatedUser,
    })
  } catch (error) {
    logger.error('Error updating company user', error)
    return res.status(500).json(createSecureErrorResponse(error))
  }
}

async function postActions(
  id: string,
  actorUserId: string,
  companyId: string,
  adminClient: ReturnType<typeof createAdminClient>,
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const existing = await loadScopedProfile(adminClient, id, companyId)
    if (!existing) {
      const { data: other } = await adminClient
        .from('user_profiles')
        .select('id, company_id')
        .eq('id', id)
        .maybeSingle()
      if (other && other.company_id !== companyId) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'Usuario fuera del alcance de la empresa',
        })
      }
      return res.status(404).json({ error: 'User not found' })
    }

    const action = (req.query.action as string) || ''

    if (action === 'send-recovery-link') {
      if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        return res.status(503).json({
          error: 'Service unavailable',
          message: 'Recuperación por correo no está configurada.',
        })
      }

      const { data: authRow, error: getUserError } = await adminClient.auth.admin.getUserById(id)
      if (getUserError || !authRow?.user?.email) {
        return res.status(404).json({
          error: 'User not found',
          message: 'No se encontró el usuario o no tiene correo en Auth',
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
        redirectTo,
      })

      if (resetErr) {
        logger.warn('company send-recovery-link error (opaque success to client)', {
          userId: id,
          message: resetErr.message,
        })
      }

      await logTenantAdminAction(
        actorUserId,
        companyId,
        'company_user_recovery_email_sent',
        'user',
        id,
        {}
      )

      return res.status(200).json({
        success: true,
        message:
          'Si el servicio de correo está activo, el usuario recibirá un enlace para restablecer la contraseña.',
      })
    }

    if (action === 'reset-password') {
      if (!env.SUPABASE_SERVICE_ROLE_KEY) {
        logger.error('Company password reset failed: SERVICE_ROLE_KEY missing')
        return res.status(503).json({
          error: 'Service unavailable',
          message: 'El reseteo de contraseña no está configurado correctamente.',
        })
      }

      const body = req.body as { new_password?: string } | undefined
      const pwCheck = validateAdminPassword(body?.new_password)
      if (!pwCheck.ok) {
        return res.status(400).json({
          error: 'Weak password',
          message: pwCheck.message,
        })
      }

      const { data: authUser, error: getUserError } = await adminClient.auth.admin.getUserById(id)
      if (getUserError || !authUser?.user) {
        return res.status(404).json({
          error: 'User not found',
          message: 'El usuario no existe en el sistema de autenticación',
        })
      }

      const { error } = await adminClient.auth.admin.updateUserById(id, {
        password: body!.new_password,
      })

      if (error) {
        logger.error('Company password reset failed', { userId: id, error })
        return res.status(400).json({
          error: 'Password update failed',
          message: 'No se pudo actualizar la contraseña.',
        })
      }

      await logTenantAdminAction(
        actorUserId,
        companyId,
        'company_user_password_reset',
        'user',
        id,
        {}
      )

      return res.status(200).json({
        success: true,
        message: 'Contraseña actualizada',
        user: { id },
      })
    }

    return res.status(400).json({ error: 'Unknown action' })
  } catch (error) {
    logger.error('Error in company user postActions', { action: req.query.action, error })
    return res.status(500).json(createSecureErrorResponse(error))
  }
}
