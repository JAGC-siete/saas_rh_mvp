import { NextApiRequest, NextApiResponse } from 'next'
import { createClient, createAdminClient } from '../../../lib/supabase/server'
import { logger } from '../../../lib/logger'
import { createSecureErrorResponse, createAuthErrorResponse } from '../../../lib/security/error-handling'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = createClient(req, res)
    
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
        return await getUsers(supabase, req, res)
      case 'POST':
        return await createUser(supabase, req, res)
      default:
        res.setHeader('Allow', ['GET', 'POST'])
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    logger.error('Error in users admin API', error)
    return res.status(500).json(createSecureErrorResponse(error))
  }
}

async function getUsers(supabase: any, req: NextApiRequest, res: NextApiResponse) {
  try {
    // Query params
    const q = (req.query.q as string | undefined)?.trim() || ''
    const role = (req.query.role as string | undefined) || ''
    const state = (req.query.state as string | undefined) || ''
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10))
    const pageSize = Math.min(100, Math.max(1, parseInt((req.query.pageSize as string) || '12', 10)))
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    // Use admin client for queries that need to access auth data
    const adminClient = createAdminClient()

    // Base query - get profiles without trying to join users table
    let query = adminClient
      .from('user_profiles')
      .select(`
        id,
        role,
        is_active,
        last_login,
        created_at,
        company_id,
        companies(name)
      `, { count: 'exact' })

    if (role) {
      query = query.eq('role', role)
    }

    if (state === 'active') query = query.eq('is_active', true)
    if (state === 'inactive') query = query.eq('is_active', false)

    // Order + range
    query = query.order('created_at', { ascending: false }).range(from, to)

    const { data: profiles, error, count } = await query

    if (error) {
      throw error
    }

    // Get all user IDs to fetch emails from auth
    const userIds = profiles?.map((p: any) => p.id) || []
    
    // Fetch emails from auth.users using admin client
    const authUsersMap = new Map<string, { email: string; last_sign_in_at: string | null }>()
    
    if (userIds.length > 0) {
      try {
        const { data: authUsers } = await adminClient.auth.admin.listUsers()
        authUsers?.users?.forEach((user: any) => {
          if (userIds.includes(user.id)) {
            authUsersMap.set(user.id, {
              email: user.email || '',
              last_sign_in_at: user.last_sign_in_at || null
            })
          }
        })
      } catch (authError: any) {
        logger.warn('Error fetching auth users, continuing without emails', { error: authError?.message || String(authError) })
      }
    }

    // Combine profile data with auth data
    let usersData = profiles?.map((profile: any) => {
      const authData = authUsersMap.get(profile.id)
      return {
        id: profile.id,
        email: authData?.email || '',
        role: profile.role,
        company_id: profile.company_id,
        company_name: profile.companies?.name || null,
        is_active: profile.is_active,
        last_login: profile.last_login || authData?.last_sign_in_at || null,
        created_at: profile.created_at
      }
    }) || []

    // Apply text search filter if provided (after fetching emails)
    if (q) {
      const searchLower = q.toLowerCase()
      usersData = usersData.filter((user: any) => 
        user.email?.toLowerCase().includes(searchLower) ||
        user.company_name?.toLowerCase().includes(searchLower)
      )
    }

    return res.status(200).json({
      success: true,
      users: usersData,
      metadata: {
        total: count || 0,
        page,
        pageSize,
        query: q,
        role: role || null,
        state: state || null
      }
    })
  } catch (error) {
    logger.error('Error fetching users', error)
    return res.status(500).json(createSecureErrorResponse(error))
  }
}

async function createUser(supabase: any, req: NextApiRequest, res: NextApiResponse) {
  try {
    const { email, password, role, company_id } = req.body

    // Validate required fields
    if (!email || !password || !role || !company_id) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Email, password, role, and company_id are required'
      })
    }

    // Validate role
    const validRoles = ['super_admin', 'company_admin', 'hr_manager', 'manager', 'employee']
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        error: 'Invalid role',
        message: `Role must be one of: ${validRoles.join(', ')}`
      })
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({
        error: 'Weak password',
        message: 'Password must be at least 8 characters long'
      })
    }

    // Verify company exists and is active
    const { data: company, error: companyError } = await supabase
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

    // Check if user already exists
    const { data: existingUser } = await supabase.auth.admin.getUserByEmail(email)
    if (existingUser.user) {
      return res.status(409).json({
        error: 'User already exists',
        message: 'A user with this email already exists'
      })
    }

    // Create user using Supabase Auth Admin API
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        company_id,
        role
      }
    })

    if (authError) {
      throw authError
    }

    // Set default permissions based on role
    let permissions = {}
    switch (role) {
      case 'super_admin':
        permissions = {
          manage_companies: true,
          manage_users: true,
          manage_employees: true,
          manage_payroll: true,
          manage_reports: true,
          manage_settings: true,
          view_audit_logs: true
        }
        break
      case 'company_admin':
        permissions = {
          manage_employees: true,
          manage_payroll: true,
          manage_reports: true,
          manage_settings: true,
          manage_departments: true,
          view_audit_logs: true
        }
        break
      case 'hr_manager':
        permissions = {
          manage_employees: true,
          manage_payroll: true,
          manage_reports: true,
          view_audit_logs: false
        }
        break
      case 'manager':
        permissions = {
          view_employees: true,
          manage_attendance: true,
          view_reports: true
        }
        break
      case 'employee':
        permissions = {
          view_profile: true,
          manage_attendance: false
        }
        break
    }

    // Create user profile
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: authUser.user.id,
        company_id,
        role,
        is_active: true,
        permissions
      })

    if (profileError) {
      // Rollback: delete auth user
      await supabase.auth.admin.deleteUser(authUser.user.id)
      throw profileError
    }

    logger.info('User created successfully', {
      userId: authUser.user.id,
      email,
      role,
      companyId: company_id,
      companyName: company.name
    })

    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        id: authUser.user.id,
        email: authUser.user.email,
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
