import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../lib/supabase/server'
import { requireSuperAdmin } from '../../../lib/auth/api-auth-fixed'
import { logger } from '../../../lib/logger'
import { createSecureErrorResponse, createAuthErrorResponse } from '../../../lib/security/error-handling'


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Verify super admin using standardized auth
    const { supabase } = await requireSuperAdmin(req, res)
    
    switch (req.method) {
      case 'GET':
        return await getCompanies(supabase, res)
      case 'POST':
        return await createCompany(supabase, req, res)
      default:
        res.setHeader('Allow', ['GET', 'POST'])
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error: any) {
    // If error is from requireSuperAdmin, it already sent response
    if (error.message === 'UNAUTHORIZED' || error.message === 'INSUFFICIENT_PERMISSIONS') {
      return // Response already sent
    }
    logger.error('Error in companies admin API', error)
    return res.status(500).json(createSecureErrorResponse(error))
  }
}

async function getCompanies(supabase: any, res: NextApiResponse) {
  try {
    // Get all companies with employee count
    const { data: companies, error } = await supabase
      .from('companies')
      .select(`
        id,
        name,
        subdomain,
        plan_type,
        is_active,
        created_at,
        updated_at,
        employees:employees(count)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    // Transform data to include employee count
    const companiesWithCount = companies?.map((company: any) => ({
      ...company,
      employee_count: company.employees?.[0]?.count || 0,
      employees: undefined // Remove the nested employees object
    }))

    return res.status(200).json({
      success: true,
      companies: companiesWithCount || []
    })
  } catch (error) {
    logger.error('Error fetching companies', error)
    return res.status(500).json(createSecureErrorResponse(error))
  }
}

async function createCompany(supabase: any, req: NextApiRequest, res: NextApiResponse) {
  try {
    const { name, subdomain, plan_type, admin_email, admin_password } = req.body

    // Validate required fields
    if (!name || !subdomain || !admin_email || !admin_password) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Name, subdomain, admin email and password are required'
      })
    }

    // Validate subdomain format (alphanumeric and hyphens only)
    if (!/^[a-z0-9-]+$/.test(subdomain)) {
      return res.status(400).json({
        error: 'Invalid subdomain',
        message: 'Subdomain must contain only lowercase letters, numbers, and hyphens'
      })
    }

    // Check if subdomain already exists
    const { data: existingCompany } = await supabase
      .from('companies')
      .select('id')
      .eq('subdomain', subdomain)
      .single()

    if (existingCompany) {
      return res.status(409).json({
        error: 'Subdomain already exists',
        message: 'This subdomain is already taken'
      })
    }

    // Start transaction by creating company first
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({
        name,
        subdomain,
        plan_type: plan_type || 'basic',
        is_active: true,
        settings: {
          currency: 'HNL',
          timezone: 'America/Tegucigalpa',
          language: 'es'
        }
      })
      .select()
      .single()

    if (companyError) {
      throw companyError
    }

    // Create admin user using Supabase Auth Admin API
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: admin_email,
      password: admin_password,
      email_confirm: true,
      user_metadata: {
        company_id: company.id,
        role: 'company_admin'
      }
    })

    if (authError) {
      // Rollback: delete the company
      await supabase.from('companies').delete().eq('id', company.id)
      throw authError
    }

    // Create user profile
    const { error: profileError } = await supabase
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
          manage_settings: true
        }
      })

    if (profileError) {
      // Rollback: delete auth user and company
      await supabase.auth.admin.deleteUser(authUser.user.id)
      await supabase.from('companies').delete().eq('id', company.id)
      throw profileError
    }

    logger.info('Company created successfully', {
      companyId: company.id,
      companyName: name,
      subdomain,
      adminEmail: admin_email
    })

    // Audit log (best-effort)
    try {
      await supabase
        .from('audit_logs')
        .insert({
          company_id: company.id,
          user_id: authUser.user.id,
          action: 'company_created',
          resource_type: 'company',
          resource_id: company.id,
          new_values: { name, subdomain, plan_type: company.plan_type },
          ip_address: (req.headers['x-forwarded-for'] as string) || undefined,
          user_agent: req.headers['user-agent']
        })
    } catch (e) {
      logger.warn('Failed to insert audit log for company create', { error: (e as any)?.message })
    }

    return res.status(201).json({
      success: true,
      message: 'Company and admin user created successfully',
      company: {
        id: company.id,
        name: company.name,
        subdomain: company.subdomain,
        plan_type: company.plan_type
      },
      admin: {
        id: authUser.user.id,
        email: authUser.user.email
      }
    })
  } catch (error) {
    logger.error('Error creating company', error)
    return res.status(500).json(createSecureErrorResponse(error))
  }
}
