import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../lib/supabase/server'
import { logger } from '../../../lib/logger'
import { createSecureErrorResponse } from '../../../lib/security/error-handling'
import { requireSuperAdmin } from '../../../lib/auth/api-auth-fixed'
import { logSuperAdminAction } from '../../../lib/security/audit-logger'
import { validateAdminPassword } from '../../../lib/auth/password-policy'
import { env } from '../../../lib/env'

function isAuthDuplicateUserError(err: unknown): boolean {
  const e = err as { message?: string; code?: string; status?: number }
  const msg = (e?.message || '').toLowerCase()
  const code = (e?.code || '').toLowerCase()
  return (
    code === 'email_exists' ||
    msg.includes('already been registered') ||
    msg.includes('already registered') ||
    msg.includes('user already exists') ||
    msg.includes('email address is already')
  )
}

/** Evita barrer todo el directorio Auth: una llamada getUserById por id de perfil. */
async function fetchAuthMetadataByUserIds(
  adminClient: ReturnType<typeof createAdminClient>,
  userIds: string[],
  chunkSize = 15
): Promise<Map<string, { email: string; last_sign_in_at: string | null }>> {
  const out = new Map<string, { email: string; last_sign_in_at: string | null }>()
  const unique = [...new Set(userIds)]
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize)
    await Promise.all(
      chunk.map(async (uid) => {
        try {
          const { data, error } = await adminClient.auth.admin.getUserById(uid)
          if (error || !data?.user) return
          const u = data.user
          out.set(u.id, {
            email: u.email || '',
            last_sign_in_at: u.last_sign_in_at ?? null
          })
        } catch {
          // omit user missing in Auth
        }
      })
    )
  }
  return out
}

function permissionsForRole(role: string): Record<string, boolean> {
  switch (role) {
    case 'super_admin':
      return {
        manage_companies: true,
        manage_users: true,
        manage_employees: true,
        manage_payroll: true,
        manage_reports: true,
        manage_settings: true,
        view_audit_logs: true
      }
    case 'company_admin':
      return {
        manage_employees: true,
        manage_payroll: true,
        manage_reports: true,
        manage_settings: true,
        manage_departments: true,
        view_audit_logs: true
      }
    case 'hr_manager':
      return {
        manage_employees: true,
        manage_payroll: true,
        manage_reports: true,
        view_audit_logs: false
      }
    case 'manager':
      return {
        view_employees: true,
        manage_attendance: true,
        can_view_attendance_reports: true,
        can_export_attendance_reports: true,
      }
    case 'employee':
      return {
        view_profile: true,
        manage_attendance: false
      }
    default:
      return {}
  }
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const auth = await requireSuperAdmin(req, res)

    switch (req.method) {
      case 'GET':
        return await getUsers(req, res)
      case 'POST':
        return await createUser(req, res, auth.user.id)
      default:
        res.setHeader('Allow', ['GET', 'POST'])
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error: any) {
    // Gracefully handle auth errors thrown by requireSuperAdmin
    if (error.message === 'UNAUTHORIZED' || error.message === 'INSUFFICIENT_PERMISSIONS') {
      return // Response is already sent by the helper
    }
    logger.error('Error in users admin API', error)
    return res.status(500).json(createSecureErrorResponse(error))
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function getUsers(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Query params
    const q = (req.query.q as string | undefined)?.trim() || ''
    const role = (req.query.role as string | undefined) || ''
    const state = (req.query.state as string | undefined) || ''
    const companyIdRaw = ((req.query.company_id as string | undefined) || '').trim()
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10))
    const pageSize = Math.min(100, Math.max(1, parseInt((req.query.pageSize as string) || '12', 10)))
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    // Use admin client for queries that need to access auth data
    const adminClient = createAdminClient()

    // Base query - get ALL profiles first (we need to fetch emails to filter)
    let baseQuery = adminClient
      .from('user_profiles')
      .select(`
        id,
        role,
        is_active,
        last_login,
        created_at,
        company_id,
        employee_id,
        companies(name),
        employees(name)
      `)

    if (role) {
      baseQuery = baseQuery.eq('role', role)
    }

    if (state === 'active') baseQuery = baseQuery.eq('is_active', true)
    if (state === 'inactive') baseQuery = baseQuery.eq('is_active', false)

    if (companyIdRaw === 'none') {
      baseQuery = baseQuery.is('company_id', null)
    } else if (companyIdRaw && UUID_RE.test(companyIdRaw)) {
      baseQuery = baseQuery.eq('company_id', companyIdRaw)
    }

    // Order
    baseQuery = baseQuery.order('created_at', { ascending: false })

    const { data: allProfiles, error: queryError } = await baseQuery

    if (queryError) {
      throw queryError
    }

    const userIds = allProfiles?.map((p: any) => p.id) || []
    let authUsersMap = new Map<string, { email: string; last_sign_in_at: string | null }>()
    if (userIds.length > 0) {
      try {
        authUsersMap = await fetchAuthMetadataByUserIds(adminClient, userIds)
      } catch (authError: any) {
        logger.warn('Error fetching auth users by id, continuing without emails', {
          error: authError?.message || String(authError)
        })
      }
    }

    // Combine profile data with auth data
    let usersData = allProfiles?.map((profile: any) => {
      const authData = authUsersMap.get(profile.id)
      const employee = profile.employees
      const employeeName = employee 
        ? (Array.isArray(employee) ? employee[0]?.name : employee.name)
        : null
      const company = profile.companies
      const companyName = company
        ? Array.isArray(company)
          ? company[0]?.name ?? null
          : (company as { name?: string }).name ?? null
        : null
      return {
        id: profile.id,
        email: authData?.email || '',
        name: employeeName,
        role: profile.role,
        company_id: profile.company_id,
        company_name: companyName,
        is_active: profile.is_active,
        last_login: profile.last_login || authData?.last_sign_in_at || null,
        created_at: profile.created_at
      }
    }) || []

    // Apply text search filter if provided (BEFORE pagination)
    if (q) {
      const searchLower = q.toLowerCase()
      usersData = usersData.filter((user: any) => 
        user.email?.toLowerCase().includes(searchLower) ||
        user.name?.toLowerCase().includes(searchLower) ||
        user.company_name?.toLowerCase().includes(searchLower)
      )
    }

    // Calculate total after filtering
    const total = usersData.length

    // Apply pagination AFTER filtering
    const paginatedUsers = usersData.slice(from, to + 1)

    return res.status(200).json({
      success: true,
      users: paginatedUsers,
      metadata: {
        total: total,
        page,
        pageSize,
        query: q,
        role: role || null,
        state: state || null,
        company_id:
          companyIdRaw === 'none' ? 'none' : companyIdRaw && UUID_RE.test(companyIdRaw) ? companyIdRaw : null
      }
    })
  } catch (error) {
    logger.error('Error fetching users', error)
    return res.status(500).json(createSecureErrorResponse(error))
  }
}

async function createUser(req: NextApiRequest, res: NextApiResponse, actorUserId: string) {
  try {
    const body = req.body || {}
    const email = typeof body.email === 'string' ? body.email.trim() : ''
    const password = body.password as string | undefined
    const role = body.role as string
    const company_id = body.company_id as string
    /** Por defecto invitación por correo (sin contraseña en el panel). `password` = modo soporte/pruebas. */
    const mode = body.mode === 'password' ? 'password' : 'invite'

    if (!email || !role || !company_id) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Se requieren email, rol e ID de empresa'
      })
    }

    const validRoles = ['super_admin', 'company_admin', 'hr_manager', 'manager', 'employee']
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        error: 'Invalid role',
        message: `El rol debe ser uno de: ${validRoles.join(', ')}`
      })
    }

    if (mode === 'password') {
      if (!password) {
        return res.status(400).json({
          error: 'Missing password',
          message: 'En modo contraseña manual se requiere contraseña'
        })
      }
      const pwCheck = validateAdminPassword(password)
      if (!pwCheck.ok) {
        return res.status(400).json({
          error: 'Weak password',
          message: pwCheck.message
        })
      }
    }

    const adminClient = createAdminClient()

    const { data: company, error: companyError } = await adminClient
      .from('companies')
      .select('id, name, is_active')
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
        message: 'Cannot create users for inactive companies'
      })
    }

    const siteUrl = (env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '')
    const redirectTo = `${siteUrl}/auth/update-password?next=${encodeURIComponent('/app/login')}`

    let authUserId: string
    let authEmail: string | null = email
    let inviteSent = false

    if (mode === 'invite') {
      const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
        data: { company_id, role },
        redirectTo
      })

      if (inviteError) {
        if (isAuthDuplicateUserError(inviteError)) {
          return res.status(409).json({
            error: 'User already exists',
            message: 'Ya existe un usuario con este correo'
          })
        }
        throw inviteError
      }

      if (!invited?.user?.id) {
        return res.status(500).json({
          error: 'Invite failed',
          message: 'No se pudo crear la invitación'
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
          company_id,
          role
        }
      })

      if (authError) {
        if (isAuthDuplicateUserError(authError)) {
          return res.status(409).json({
            error: 'User already exists',
            message: 'A user with this email already exists'
          })
        }
        throw authError
      }

      authUserId = authUser.user.id
      authEmail = authUser.user.email ?? email
    }

    const permissions = permissionsForRole(role)

    const { error: profileError } = await adminClient.from('user_profiles').insert({
      id: authUserId,
      company_id,
      role,
      is_active: true,
      permissions
    })

    if (profileError) {
      await adminClient.auth.admin.deleteUser(authUserId)
      throw profileError
    }

    logger.info(mode === 'invite' ? 'User invited successfully' : 'User created successfully', {
      userId: authUserId,
      email,
      role,
      companyId: company_id,
      companyName: company.name,
      mode
    })

    await logSuperAdminAction(actorUserId, mode === 'invite' ? 'user_invited' : 'user_created', 'user', authUserId, {
      target_role: role,
      company_id
    })

    return res.status(201).json({
      success: true,
      message:
        mode === 'invite'
          ? 'Invitación enviada. El usuario definirá su contraseña desde el enlace del correo.'
          : 'User created successfully',
      invite_sent: inviteSent,
      user: {
        id: authUserId,
        email: authEmail,
        role,
        company_id,
        company_name: company.name
      }
    })
  } catch (error) {
    logger.error('Error creating user', error)
    return res.status(500).json(createSecureErrorResponse(error))
  }
}

// Export handler (idle timeout is handled by middleware.ts globally)
export default handler
