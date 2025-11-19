import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../lib/supabase/server'
import { requireSuperAdmin } from '../../../lib/auth/api-auth-fixed'
import { logger } from '../../../lib/logger'
import { createSecureErrorResponse } from '../../../lib/security/error-handling'

/**
 * Secure Company Setup API
 * Creates a complete company with admin user, departments, and work schedules
 * REPLACES: create-prohalca (removed for security)
 */

interface Department {
  name: string
  description?: string
  metadata?: Record<string, any>
}

interface WorkSchedule {
  name: string
  monday_start: string
  monday_end: string
  tuesday_start: string
  tuesday_end: string
  wednesday_start: string
  wednesday_end: string
  thursday_start: string
  thursday_end: string
  friday_start: string
  friday_end: string
  saturday_start?: string
  saturday_end?: string
  sunday_start?: string
  sunday_end?: string
  break_duration?: number
  timezone?: string
  metadata?: Record<string, any>
}

interface SetupCompanyRequest {
  company: {
    name: string
    subdomain: string
    plan_type: 'trial' | 'basic' | 'premium' | 'enterprise'
    settings?: Record<string, any>
  }
  admin: {
    email: string
    password: string
    first_name?: string
    last_name?: string
  }
  departments?: Department[]
  work_schedules?: WorkSchedule[]
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Verify super admin authentication
    const { user: superAdminUser } = await requireSuperAdmin(req, res)
    
    const adminClient = createAdminClient()
    
    const {
      company: companyData,
      admin: adminData,
      departments = [],
      work_schedules = []
    } = req.body as SetupCompanyRequest

    // Validate required fields
    if (!companyData?.name || !companyData?.subdomain || !adminData?.email || !adminData?.password) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'company.name, company.subdomain, admin.email, and admin.password are required'
      })
    }

    // Validate password strength
    if (adminData.password.length < 8) {
      return res.status(400).json({
        error: 'Weak password',
        message: 'Password must be at least 8 characters long'
      })
    }

    // Validate subdomain format
    if (!/^[a-z0-9-]+$/.test(companyData.subdomain)) {
      return res.status(400).json({
        error: 'Invalid subdomain',
        message: 'Subdomain must contain only lowercase letters, numbers, and hyphens'
      })
    }

    logger.info('Starting company setup', {
      superAdminId: superAdminUser.id,
      companyName: companyData.name,
      subdomain: companyData.subdomain
    })

    // 1. Check if subdomain already exists
    const { data: existingCompany } = await adminClient
      .from('companies')
      .select('id')
      .eq('subdomain', companyData.subdomain)
      .single()

    if (existingCompany) {
      return res.status(409).json({
        error: 'Subdomain already exists',
        message: `The subdomain '${companyData.subdomain}' is already taken`
      })
    }

    // 2. Create company
    const { data: company, error: companyError } = await adminClient
      .from('companies')
      .insert({
        name: companyData.name,
        subdomain: companyData.subdomain,
        plan_type: companyData.plan_type || 'premium',
        is_active: true,
        settings: {
          currency: 'HNL',
          timezone: 'America/Tegucigalpa',
          language: 'es',
          ...companyData.settings
        }
      })
      .select()
      .single()

    if (companyError || !company) {
      throw companyError || new Error('Failed to create company')
    }

    logger.info('Company created', { companyId: company.id })

    // 3. Check if admin email already exists
    const { data: authUsers } = await adminClient.auth.admin.listUsers()
    const existingUser = authUsers?.users?.find((u: any) => u.email === adminData.email)

    if (existingUser) {
      await adminClient.from('companies').delete().eq('id', company.id)
      return res.status(409).json({
        error: 'User already exists',
        message: `A user with email '${adminData.email}' already exists`
      })
    }

    // 4. Create admin user
    const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
      email: adminData.email,
      password: adminData.password,
      email_confirm: true,
      user_metadata: {
        company_id: company.id,
        role: 'company_admin',
        first_name: adminData.first_name || '',
        last_name: adminData.last_name || ''
      }
    })

    if (authError || !authUser) {
      await adminClient.from('companies').delete().eq('id', company.id)
      throw authError || new Error('Failed to create admin user')
    }

    logger.info('Admin user created', { userId: authUser.user.id })

    // 5. Create user profile
    const { error: profileError } = await adminClient
      .from('user_profiles')
      .insert({
        id: authUser.user.id,
        company_id: company.id,
        role: 'company_admin',
        is_active: true,
        permissions: {
          manage_employees: true,
          manage_payroll: true,
          manage_reports: true,
          manage_settings: true,
          manage_departments: true,
          view_audit_logs: true
        }
      })

    if (profileError) {
      await adminClient.auth.admin.deleteUser(authUser.user.id)
      await adminClient.from('companies').delete().eq('id', company.id)
      throw profileError
    }

    logger.info('User profile created')

    // 6. Create departments (if provided)
    let createdDepartments = []
    if (departments.length > 0) {
      const deptData = departments.map(dept => ({
        company_id: company.id,
        name: dept.name,
        description: dept.description || null,
        metadata: dept.metadata || {}
      }))

      const { data: newDepts, error: deptError } = await adminClient
        .from('departments')
        .insert(deptData)
        .select()

      if (deptError) {
        logger.warn('Failed to create departments, continuing...', { error: deptError })
      } else {
        createdDepartments = newDepts || []
        logger.info('Departments created', { count: createdDepartments.length })
      }
    }

    // 7. Create work schedules (if provided)
    let createdSchedules = []
    if (work_schedules.length > 0) {
      const scheduleData = work_schedules.map(schedule => ({
        company_id: company.id,
        ...schedule,
        timezone: schedule.timezone || 'America/Tegucigalpa',
        break_duration: schedule.break_duration || 60
      }))

      const { data: newSchedules, error: scheduleError } = await adminClient
        .from('work_schedules')
        .insert(scheduleData)
        .select()

      if (scheduleError) {
        logger.warn('Failed to create work schedules, continuing...', { error: scheduleError })
      } else {
        createdSchedules = newSchedules || []
        logger.info('Work schedules created', { count: createdSchedules.length })
      }
    }

    // 8. Create audit log
    await adminClient
      .from('audit_logs')
      .insert({
        company_id: company.id,
        user_id: authUser.user.id,
        action: 'company_created',
        resource_type: 'company',
        resource_id: company.id,
        details: {
          company_name: company.name,
          subdomain: company.subdomain,
          admin_email: adminData.email,
          departments_count: createdDepartments.length,
          schedules_count: createdSchedules.length,
          created_by_super_admin: superAdminUser.id
        }
      })

    logger.info('Company setup completed successfully', {
      companyId: company.id,
      adminUserId: authUser.user.id
    })

    // ⚠️ SECURITY: DO NOT return password in response
    return res.status(201).json({
      success: true,
      message: 'Company setup completed successfully',
      data: {
        company: {
          id: company.id,
          name: company.name,
          subdomain: company.subdomain,
          plan_type: company.plan_type
        },
        admin: {
          id: authUser.user.id,
          email: authUser.user.email
          // ⚠️ Password intentionally omitted for security
        },
        departments: createdDepartments.length,
        work_schedules: createdSchedules.length
      }
    })

  } catch (error: any) {
    // Handle authentication errors
    if (error.message === 'UNAUTHORIZED' || error.message === 'INSUFFICIENT_PERMISSIONS') {
      return // Response already sent
    }

    logger.error('Error in company setup', error)
    return res.status(500).json(createSecureErrorResponse(error))
  }
}

