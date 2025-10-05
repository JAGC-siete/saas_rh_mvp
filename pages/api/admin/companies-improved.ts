import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../lib/supabase/server'
import { logger } from '../../../lib/logger'

interface ListResponse {
  success: boolean
  companies?: any[]
  metadata?: {
    total: number
    page: number
    pageSize: number
  }
  error?: string
  message?: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ListResponse>) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    const supabase = createClient(req, res)

    // Auth: require super_admin
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return res.status(401).json({ success: false, error: 'Authentication required' })
    }

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'super_admin') {
      return res.status(403).json({ success: false, error: 'Super admin access required' })
    }

    // Query params
    const q = (req.query.q as string | undefined)?.trim().toLowerCase() || ''
    const activeParam = req.query.active as string | undefined
    const pageParam = Number(req.query.page || 1)
    const pageSizeParam = Number(req.query.pageSize || 12)
    const orderBy = (req.query.orderBy as string) || 'created_at'
    const orderDir = ((req.query.orderDir as string) || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc'

    const page = Math.max(1, isFinite(pageParam) ? pageParam : 1)
    const pageSize = Math.min(100, Math.max(1, isFinite(pageSizeParam) ? pageSizeParam : 12))
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    // Build base query with employee count via RPC style select
    let baseQuery = supabase
      .from('companies')
      .select(`
        id,
        name,
        subdomain,
        plan_type,
        is_active,
        deleted_at,
        created_at,
        employees:employees(count)
      `, { count: 'exact' })

    // Exclude soft-deleted by default
    baseQuery = baseQuery.is('deleted_at', null)

    // Active filter
    if (activeParam === 'true') {
      baseQuery = baseQuery.eq('is_active', true)
    }

    // Text search (name, subdomain, plan_type)
    // Note: Using ilike requires separate filters; Supabase doesn't support OR across columns directly in one call
    if (q) {
      baseQuery = baseQuery.or(`name.ilike.%${q}%,subdomain.ilike.%${q}%,plan_type.ilike.%${q}%`)
    }

    // Order
    baseQuery = baseQuery.order(orderBy, { ascending: orderDir === 'asc' })

    // Pagination
    const { data, error, count } = await baseQuery.range(from, to)
    if (error) {
      throw error
    }

    const companies = (data || []).map((company: any) => ({
      id: company.id,
      name: company.name,
      subdomain: company.subdomain,
      plan_type: company.plan_type,
      is_active: company.is_active,
      created_at: company.created_at,
      employee_count: company.employees?.[0]?.count || 0
    }))

    return res.status(200).json({
      success: true,
      companies,
      metadata: {
        total: count ?? companies.length,
        page,
        pageSize
      }
    })
  } catch (err) {
    logger.error('Error in companies-improved', err)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminApiHandler, AdminApiHandler, AdminApiContext } from '../../../lib/auth/admin-api-wrapper'
import { ADMIN_OPERATIONS, ADMIN_RESOURCES } from '../../../lib/logging/admin-logger'
import { logger } from '../../../lib/logger'

/**
 * Improved companies admin API with consistent logging
 */
const companiesHandler: AdminApiHandler = {
  GET: async (req: NextApiRequest, res: NextApiResponse, context: AdminApiContext) => {
    try {
      const { supabase, userProfile } = context

      // Query params
      const q = (req.query.q as string | undefined)?.trim() || ''
      const activeParam = req.query.active as string | undefined
      const page = Math.max(1, parseInt((req.query.page as string) || '1', 10))
      const pageSize = Math.min(100, Math.max(1, parseInt((req.query.pageSize as string) || '12', 10)))
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      // Base query with count
      let query = supabase
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
        `, { count: 'exact' })

      // Filters
      if (q) {
        // ilike on multiple columns via or()
        query = query.or(
          `name.ilike.%${q}%,subdomain.ilike.%${q}%,plan_type.ilike.%${q}%`
        )
      }

      if (activeParam === 'true') {
        query = query.eq('is_active', true)
      } else if (activeParam === 'false') {
        query = query.eq('is_active', false)
      }

      // Order newest first and range for pagination
      query = query.order('created_at', { ascending: false }).range(from, to)

      const { data: companies, error, count } = await query

      if (error) {
        throw error
      }

      // Transform data to include employee count
      const companiesWithCount = companies?.map((company: any) => ({
        ...company,
        employee_count: company.employees?.[0]?.count || 0,
        employees: undefined // Remove the nested employees object
      }))

      // Log successful operation
      logger.info('Companies list retrieved successfully', {
        userId: userProfile.id,
        userRole: userProfile.role,
        companyCount: companiesWithCount?.length || 0
      })

      return res.status(200).json({
        success: true,
        companies: companiesWithCount || [],
        metadata: {
          total: count || 0,
          page,
          pageSize,
          query: q,
          active: activeParam ?? null,
          retrievedBy: userProfile.id,
          retrievedAt: new Date().toISOString()
        }
      })
    } catch (error) {
      logger.error('Error retrieving companies list', {
        userId: context.userProfile.id,
        error: error instanceof Error ? error.message : String(error)
      })
      return res.status(500).json({ success: false, error: 'Failed to retrieve companies', message: error instanceof Error ? error.message : 'Unknown error' })
    }
  },

  POST: async (req: NextApiRequest, res: NextApiResponse, context: AdminApiContext) => {
    try {
      const { supabase, userProfile } = context
      const { name, subdomain, plan_type, admin_email, admin_password } = req.body

      // Validate required fields
      if (!name || !subdomain || !admin_email || !admin_password) {
        logger.warn('Company creation failed - missing required fields', {
          userId: userProfile.id,
          providedFields: Object.keys(req.body),
          missingFields: ['name', 'subdomain', 'admin_email', 'admin_password'].filter(field => !req.body[field])
        })
        
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'Name, subdomain, admin email and password are required',
          provided: Object.keys(req.body)
        })
      }

      // Validate subdomain format
      if (!/^[a-z0-9-]+$/.test(subdomain)) {
        logger.warn('Company creation failed - invalid subdomain format', {
          userId: userProfile.id,
          subdomain,
          adminEmail: admin_email
        })
        
        return res.status(400).json({
          error: 'Invalid subdomain',
          message: 'Subdomain must contain only lowercase letters, numbers, and hyphens'
        })
      }

      // Check if subdomain already exists
      const { data: existingCompany, error: checkError } = await supabase
        .from('companies')
        .select('id')
        .eq('subdomain', subdomain)
        .single()

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw checkError
      }

      if (existingCompany) {
        logger.warn('Company creation failed - subdomain already exists', {
          userId: userProfile.id,
          subdomain,
          adminEmail: admin_email,
          existingCompanyId: existingCompany.id
        })
        
        return res.status(409).json({
          error: 'Subdomain already exists',
          message: 'A company with this subdomain already exists'
        })
      }

      // Create company
      const { data: newCompany, error: companyError } = await supabase
        .from('companies')
        .insert({
          name,
          subdomain,
          plan_type: plan_type || 'basic',
          is_active: true
        })
        .select()
        .single()

      if (companyError) {
        throw companyError
      }

      // Create admin user
      const { data: adminUser, error: userError } = await supabase.auth.admin.createUser({
        email: admin_email,
        password: admin_password,
        email_confirm: true,
        user_metadata: {
          company_id: newCompany.id,
          role: 'company_admin'
        }
      })

      if (userError) {
        // Rollback company creation
        await supabase.from('companies').delete().eq('id', newCompany.id)
        throw userError
      }

      // Create user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: adminUser.user.id,
          company_id: newCompany.id,
          role: 'company_admin',
          is_active: true
        })

      if (profileError) {
        // Rollback user and company creation
        await supabase.auth.admin.deleteUser(adminUser.user.id)
        await supabase.from('companies').delete().eq('id', newCompany.id)
        throw profileError
      }

      // Log successful company creation
      logger.info('Company created successfully', {
        userId: userProfile.id,
        userRole: userProfile.role,
        newCompanyId: newCompany.id,
        companyName: name,
        subdomain,
        adminEmail: admin_email,
        adminUserId: adminUser.user.id
      })

      return res.status(201).json({
        success: true,
        company: {
          ...newCompany,
          admin_user_id: adminUser.user.id
        },
        message: 'Company and admin user created successfully'
      })
    } catch (error) {
      logger.error('Error creating company', {
        userId: context.userProfile.id,
        error: error instanceof Error ? error.message : String(error),
        companyData: {
          name: req.body.name,
          subdomain: req.body.subdomain,
          adminEmail: req.body.admin_email
        }
      })
      return res.status(500).json({ success: false, error: 'Failed to create company', message: error instanceof Error ? error.message : 'Unknown error' })
    }
  }
}

// Export the handler with automatic logging and validation
export default createAdminApiHandler({
  operation: ADMIN_OPERATIONS.LIST,
  resource: ADMIN_RESOURCES.COMPANY,
  requireSuperAdmin: true,
  allowedMethods: ['GET', 'POST']
}, companiesHandler)

