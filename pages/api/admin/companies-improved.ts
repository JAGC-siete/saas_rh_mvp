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
          total: companiesWithCount?.length || 0,
          retrievedBy: userProfile.id,
          retrievedAt: new Date().toISOString()
        }
      })
    } catch (error) {
      logger.error('Error retrieving companies list', {
        userId: context.userProfile.id,
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
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
      throw error
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

