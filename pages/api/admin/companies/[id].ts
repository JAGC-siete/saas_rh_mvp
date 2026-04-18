import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../../lib/supabase/server'
import { requireSuperAdmin } from '../../../../lib/auth/api-auth-fixed'
import { logger } from '../../../../lib/logger'
import { createSecureErrorResponse, createAuthErrorResponse } from '../../../../lib/security/error-handling'
import {
  COMMERCIAL_PLAN_TYPES,
  COMMERCIAL_TO_INTERNAL,
  normalizePlanType,
} from '../../../../lib/billing/plans'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Ensure id is available in catch scope
  const id = typeof req.query.id === 'string' ? req.query.id : Array.isArray(req.query.id) ? req.query.id[0] : undefined
  try {
    if (!id) {
      return res.status(400).json({ error: 'Company ID is required' })
    }
    
    // Verify super admin using standardized auth
    await requireSuperAdmin(req, res)
    
    // Use admin client for all database operations (bypasses RLS)
    const supabase = createAdminClient()

    switch (req.method) {
      case 'GET':
        return await getCompany(supabase, id, res)
      case 'PATCH':
        return await updateCompany(supabase, id, req, res)
      case 'DELETE':
        return await deleteCompany(supabase, id, res)
      default:
        res.setHeader('Allow', ['GET', 'PATCH', 'DELETE'])
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error: any) {
    // If error is from requireSuperAdmin, it already sent response
    if (error.message === 'UNAUTHORIZED' || error.message === 'INSUFFICIENT_PERMISSIONS') {
      return // Response already sent
    }
    logger.error('Error in company admin API', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      id
    })
    return res.status(500).json({ success: false, error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' })
  }
}

async function getCompany(supabase: any, id: string, res: NextApiResponse) {
  try {
    // Get company data without trying to join users table
    const { data: company, error } = await supabase
      .from('companies')
      .select(`
        id,
        name,
        subdomain,
        plan_type,
        is_active,
        settings,
        created_at,
        updated_at,
        employees:employees(count),
        user_profiles:user_profiles(
          id,
          role,
          is_active,
          created_at
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Company not found' })
      }
      throw error
    }

    // Get user IDs to fetch emails from auth
    const userIds = company.user_profiles?.map((p: any) => p.id) || []
    const authUsersMap = new Map<string, string>()
    
    if (userIds.length > 0) {
      try {
        const { data: authUsers } = await supabase.auth.admin.listUsers()
        authUsers?.users?.forEach((user: any) => {
          if (userIds.includes(user.id)) {
            authUsersMap.set(user.id, user.email || '')
          }
        })
      } catch (authError) {
        logger.warn('Error fetching auth users for company', { id, error: authError })
      }
    }

    // Resolve effective features (plan mapping + per-company overrides) and raw overrides.
    const [featuresRes, overridesRes] = await Promise.all([
      supabase
        .from('v_company_effective_features')
        .select('feature_key, feature_name, is_enabled, has_override, override_reason')
        .eq('company_id', id)
        .order('feature_key'),
      supabase
        .from('company_feature_overrides')
        .select('feature_key, is_enabled, reason, updated_at')
        .eq('company_id', id),
    ])

    if (featuresRes.error) {
      logger.warn('Error fetching effective features for company', { id, error: featuresRes.error.message })
    }
    if (overridesRes.error) {
      logger.warn('Error fetching feature overrides for company', { id, error: overridesRes.error.message })
    }

    const commercialPlan = (company.plan_type || 'basic').toLowerCase()
    const internalPlanKey =
      COMMERCIAL_TO_INTERNAL[commercialPlan as keyof typeof COMMERCIAL_TO_INTERNAL] || 'basic'

    // Transform data
    const companyData = {
      ...company,
      employee_count: company.employees?.[0]?.count || 0,
      user_count: company.user_profiles?.length || 0,
      employees: undefined,
      users: company.user_profiles?.map((profile: any) => ({
        id: profile.id,
        role: profile.role,
        is_active: profile.is_active,
        created_at: profile.created_at,
        email: authUsersMap.get(profile.id) || ''
      })),
      plan: {
        commercial: commercialPlan,
        internal_key: internalPlanKey,
      },
      effective_features: featuresRes.data || [],
      overrides: overridesRes.data || [],
    }

    return res.status(200).json({
      success: true,
      company: companyData
    })
  } catch (error) {
    logger.error('Error fetching company', {
      error: error instanceof Error ? error.message : String(error),
      id
    })
    return res.status(500).json({ success: false, error: 'Failed to fetch company', message: error instanceof Error ? error.message : 'Unknown error' })
  }
}

async function updateCompany(supabase: any, id: string, req: NextApiRequest, res: NextApiResponse) {
  try {
    const { name, subdomain, plan_type, is_active, settings } = req.body

    // Build update object with only provided fields
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (subdomain !== undefined) {
      // Allow clearing the subdomain (legacy rows have NULL/empty)
      if (subdomain === null || subdomain === '') {
        updateData.subdomain = null
      } else if (typeof subdomain === 'string') {
        // Validate format only when it actually changes; otherwise accept legacy
        // values (uppercase, underscores, etc.) that predate the format check.
        const { data: currentRow, error: currentErr } = await supabase
          .from('companies')
          .select('subdomain')
          .eq('id', id)
          .maybeSingle()

        if (currentErr) {
          logger.warn('Could not load current subdomain for validation', { id, error: currentErr.message })
        }

        const unchanged = (currentRow?.subdomain || '') === subdomain
        if (!unchanged && !/^[a-z0-9-]+$/.test(subdomain)) {
          return res.status(400).json({
            error: 'Invalid subdomain',
            message: 'Subdomain must contain only lowercase letters, numbers, and hyphens'
          })
        }
        updateData.subdomain = subdomain
      } else {
        return res.status(400).json({
          error: 'Invalid subdomain',
          message: 'Subdomain must be a string'
        })
      }
    }
    if (plan_type !== undefined) {
      const normalizedPlan = normalizePlanType(plan_type)
      if (!normalizedPlan) {
        return res.status(400).json({
          error: 'Invalid plan_type',
          message: `plan_type must be one of: ${COMMERCIAL_PLAN_TYPES.join(', ')}`
        })
      }
      updateData.plan_type = normalizedPlan
    }
    if (is_active !== undefined) updateData.is_active = is_active
    if (settings !== undefined) updateData.settings = settings

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        error: 'No fields to update',
        message: 'At least one field must be provided'
      })
    }

    // Check if subdomain is being changed and if it conflicts
    if (subdomain) {
      const { data: existingCompany } = await supabase
        .from('companies')
        .select('id')
        .eq('subdomain', subdomain)
        .neq('id', id)
        .single()

      if (existingCompany) {
        return res.status(409).json({
          error: 'Subdomain already exists',
          message: 'This subdomain is already taken by another company'
        })
      }
    }

    const { data: company, error } = await supabase
      .from('companies')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Company not found' })
      }
      throw error
    }

    logger.info('Company updated successfully', {
      companyId: id,
      updatedFields: Object.keys(updateData)
    })

    // Audit log (best-effort)
    try {
      await supabase
        .from('audit_logs')
        .insert({
          company_id: id,
          action: updateData.is_active === false ? 'company_deactivated' : updateData.is_active === true ? 'company_activated' : 'company_updated',
          resource_type: 'company',
          resource_id: id,
          new_values: updateData,
        })
    } catch (e) {
      // ignore audit failures
    }

    return res.status(200).json({
      success: true,
      message: 'Company updated successfully',
      company
    })
  } catch (error) {
    logger.error('Error updating company', {
      error: error instanceof Error ? error.message : String(error),
      id
    })
    return res.status(500).json({ success: false, error: 'Failed to update company', message: error instanceof Error ? error.message : 'Unknown error' })
  }
}

async function deleteCompany(supabase: any, id: string, res: NextApiResponse) {
  try {
    // Check if company has employees or users
    const { data: employees } = await supabase
      .from('employees')
      .select('id')
      .eq('company_id', id)
      .limit(1)

    const { data: users } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('company_id', id)
      .limit(1)

    if (employees?.length > 0 || users?.length > 0) {
      return res.status(409).json({
        error: 'Cannot delete company',
        message: 'Company has employees or users. Please remove them first or deactivate the company instead.'
      })
    }

    const { error } = await supabase
      .from('companies')
      .delete()
      .eq('id', id)

    if (error) {
      throw error
    }

    logger.info('Company deleted successfully', { companyId: id })

    // Audit log (best-effort)
    try {
      await supabase
        .from('audit_logs')
        .insert({
          company_id: id,
          action: 'company_deleted',
          resource_type: 'company',
          resource_id: id
        })
    } catch (e) {}

    return res.status(200).json({
      success: true,
      message: 'Company deleted successfully'
    })
  } catch (error) {
    logger.error('Error deleting company', {
      error: error instanceof Error ? error.message : String(error),
      id
    })
    return res.status(500).json({ success: false, error: 'Failed to delete company', message: error instanceof Error ? error.message : 'Unknown error' })
  }
}
