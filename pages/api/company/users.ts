import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../lib/supabase/server'
import { logger } from '../../../lib/logger'
import { createSecureErrorResponse } from '../../../lib/security/error-handling'
import { requireAdminWithTenant } from '../../../lib/auth/api-guards'
import { logTenantAdminAction } from '../../../lib/security/audit-logger'
import { validateAdminPassword } from '../../../lib/auth/password-policy'
import { env } from '../../../lib/env'
import {
  COMPANY_MANAGED_ROLES,
  buildCompanyUserPermissions,
  isAuthDuplicateUserError,
  isCompanyManagedRole,
  parseModuleGrantsFromBody,
  type CompanyManagedRole,
} from '../../../lib/company/users'
import {
  fetchAuthMetadataByUserIds,
  loadCompanyEffectiveFeatures,
} from '../../../lib/company/users-server'

async function handler(req: NextApiRequest, res: NextApiResponse) {
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

    switch (req.method) {
      case 'GET':
        return await listUsers(req, res, auth.companyId, auth.adminClient)
      case 'POST':
        return await createUser(req, res, auth.user.id, auth.companyId, auth.adminClient)
      default:
        res.setHeader('Allow', ['GET', 'POST'])
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
    logger.error('Error in company users API', error)
    return res.status(500).json(createSecureErrorResponse(error))
  }
}

async function listUsers(
  req: NextApiRequest,
  res: NextApiResponse,
  companyId: string,
  adminClient: ReturnType<typeof createAdminClient>
) {
  try {
    const q = (req.query.q as string | undefined)?.trim() || ''
    const role = (req.query.role as string | undefined) || ''
    const state = (req.query.state as string | undefined) || ''
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10))
    const pageSize = Math.min(100, Math.max(1, parseInt((req.query.pageSize as string) || '12', 10)))
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let baseQuery = adminClient
      .from('user_profiles')
      .select(
        `
        id,
        role,
        is_active,
        last_login,
        created_at,
        company_id,
        employee_id,
        permissions,
        employees(name)
      `
      )
      .eq('company_id', companyId)
      .neq('role', 'super_admin')

    if (role) {
      if (!isCompanyManagedRole(role)) {
        return res.status(400).json({ error: 'Invalid role filter' })
      }
      baseQuery = baseQuery.eq('role', role)
    }

    if (state === 'active') baseQuery = baseQuery.eq('is_active', true)
    if (state === 'inactive') baseQuery = baseQuery.eq('is_active', false)

    baseQuery = baseQuery.order('created_at', { ascending: false })

    const { data: allProfiles, error: queryError } = await baseQuery
    if (queryError) throw queryError

    const userIds = allProfiles?.map((p: { id: string }) => p.id) || []
    let authUsersMap = new Map<string, { email: string; last_sign_in_at: string | null }>()
    if (userIds.length > 0) {
      try {
        authUsersMap = await fetchAuthMetadataByUserIds(adminClient, userIds)
      } catch (authError: any) {
        logger.warn('company users: auth metadata fetch failed', {
          error: authError?.message || String(authError),
        })
      }
    }

    let usersData =
      allProfiles?.map((profile: any) => {
        const authData = authUsersMap.get(profile.id)
        const employee = profile.employees
        const employeeName = employee
          ? Array.isArray(employee)
            ? employee[0]?.name
            : employee.name
          : null
        return {
          id: profile.id,
          email: authData?.email || '',
          name: employeeName,
          role: profile.role,
          company_id: profile.company_id,
          is_active: profile.is_active,
          last_login: profile.last_login || authData?.last_sign_in_at || null,
          created_at: profile.created_at,
        }
      }) || []

    if (q) {
      const searchLower = q.toLowerCase()
      usersData = usersData.filter(
        (user: { email?: string; name?: string | null }) =>
          user.email?.toLowerCase().includes(searchLower) ||
          user.name?.toLowerCase().includes(searchLower)
      )
    }

    const total = usersData.length
    const paginatedUsers = usersData.slice(from, to + 1)

    return res.status(200).json({
      success: true,
      users: paginatedUsers,
      metadata: {
        total,
        page,
        pageSize,
        query: q,
        role: role || null,
        state: state || null,
        company_id: companyId,
      },
    })
  } catch (error) {
    logger.error('Error listing company users', error)
    return res.status(500).json(createSecureErrorResponse(error))
  }
}

async function createUser(
  req: NextApiRequest,
  res: NextApiResponse,
  actorUserId: string,
  companyId: string,
  adminClient: ReturnType<typeof createAdminClient>
) {
  try {
    const body = req.body || {}
    const email = typeof body.email === 'string' ? body.email.trim() : ''
    const password = body.password as string | undefined
    const role = body.role as string
    const mode = body.mode === 'password' ? 'password' : 'invite'
    const canViewSalary =
      body.can_view_salary === true ? true : body.can_view_salary === false ? false : null
    const moduleGrants = parseModuleGrantsFromBody(body)

    // Never accept company_id from body
    if (body.company_id !== undefined) {
      return res.status(400).json({
        error: 'Invalid field',
        message: 'company_id no se acepta en el body; se asigna desde la sesión',
      })
    }

    if (!email || !role) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Se requieren email y rol',
      })
    }

    if (!isCompanyManagedRole(role)) {
      return res.status(400).json({
        error: 'Invalid role',
        message: `El rol debe ser uno de: ${COMPANY_MANAGED_ROLES.join(', ')}`,
      })
    }

    if (mode === 'password') {
      if (!password) {
        return res.status(400).json({
          error: 'Missing password',
          message: 'En modo contraseña manual se requiere contraseña',
        })
      }
      const pwCheck = validateAdminPassword(password)
      if (!pwCheck.ok) {
        return res.status(400).json({
          error: 'Weak password',
          message: pwCheck.message,
        })
      }
    }

    const { data: company, error: companyError } = await adminClient
      .from('companies')
      .select('id, name, is_active')
      .eq('id', companyId)
      .single()

    if (companyError || !company) {
      return res.status(404).json({
        error: 'Company not found',
        message: 'La empresa de la sesión no existe',
      })
    }

    if (!company.is_active) {
      return res.status(400).json({
        error: 'Company inactive',
        message: 'No se pueden crear usuarios para empresas inactivas',
      })
    }

    const companyFeatures = await loadCompanyEffectiveFeatures(companyId)
    const permissions = buildCompanyUserPermissions({
      role: role as CompanyManagedRole,
      moduleGrants,
      canViewSalary,
      companyFeatures,
    })

    const siteUrl = (env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '')
    const redirectTo = `${siteUrl}/auth/update-password?next=${encodeURIComponent('/app/login')}`

    let authUserId: string
    let authEmail: string | null = email
    let inviteSent = false

    if (mode === 'invite') {
      const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
        email,
        {
          data: { company_id: companyId, role },
          redirectTo,
        }
      )

      if (inviteError) {
        if (isAuthDuplicateUserError(inviteError)) {
          return res.status(409).json({
            error: 'User already exists',
            message: 'Ya existe un usuario con este correo',
          })
        }
        throw inviteError
      }

      if (!invited?.user?.id) {
        return res.status(500).json({
          error: 'Invite failed',
          message: 'No se pudo crear la invitación',
        })
      }

      authUserId = invited.user.id
      authEmail = invited.user.email ?? email
      inviteSent = true
    } else {
      const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
        email,
        password: password!,
        email_confirm: true,
        user_metadata: {
          company_id: companyId,
          role,
        },
      })

      if (authError) {
        if (isAuthDuplicateUserError(authError)) {
          return res.status(409).json({
            error: 'User already exists',
            message: 'Ya existe un usuario con este correo',
          })
        }
        throw authError
      }

      authUserId = authUser.user.id
      authEmail = authUser.user.email ?? email
    }

    const { error: profileError } = await adminClient.from('user_profiles').insert({
      id: authUserId,
      company_id: companyId,
      role,
      is_active: true,
      permissions,
    })

    if (profileError) {
      await adminClient.auth.admin.deleteUser(authUserId)
      throw profileError
    }

    await logTenantAdminAction(
      actorUserId,
      companyId,
      mode === 'invite' ? 'company_user_invited' : 'company_user_created',
      'user',
      authUserId,
      {
        target_role: role,
        can_view_salary: permissions.can_view_salary === true,
        can_edit_salary: permissions.can_edit_salary === true,
        mode,
      }
    )

    logger.info(mode === 'invite' ? 'Company user invited' : 'Company user created', {
      userId: authUserId,
      role,
      companyId,
      actorUserId,
      mode,
    })

    return res.status(201).json({
      success: true,
      message:
        mode === 'invite'
          ? 'Invitación enviada. El usuario definirá su contraseña desde el enlace del correo.'
          : 'Usuario creado correctamente',
      invite_sent: inviteSent,
      user: {
        id: authUserId,
        email: authEmail,
        role,
        company_id: companyId,
        permissions,
      },
    })
  } catch (error) {
    logger.error('Error creating company user', error)
    return res.status(500).json(createSecureErrorResponse(error))
  }
}

export default handler
