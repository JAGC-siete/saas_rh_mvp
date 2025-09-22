import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../lib/supabase/server'
import { logger } from '../../../lib/logger'
import { createSecureErrorResponse, createAuthErrorResponse } from '../../../lib/security/error-handling'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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
        return await getUsers(supabase, res)
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

async function getUsers(supabase: any, res: NextApiResponse) {
  try {
    // Get all user profiles with company information
    const { data: users, error } = await supabase
      .from('user_profiles')
      .select(`
        id,
        role,
        is_active,
        last_login,
        created_at,
        company_id,
        companies:companies(name),
        auth_users:users(email)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    // Transform data to flatten structure
    const usersData = users?.map((user: any) => ({
      id: user.id,
      email: user.auth_users?.email,
      role: user.role,
      company_id: user.company_id,
      company_name: user.companies?.name,
      is_active: user.is_active,
      last_login: user.last_login,
      created_at: user.created_at
    }))

    return res.status(200).json({
      success: true,
      users: usersData || []
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
