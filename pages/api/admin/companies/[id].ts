import { NextApiRequest, NextApiResponse } from 'next'
import { createServerSupabaseClient } from '../../../../lib/supabase/server'
import { logger } from '../../../../lib/logger'
import { createSecureErrorResponse, createAuthErrorResponse } from '../../../../lib/security/error-handling'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = createServerSupabaseClient()
    const { id } = req.query

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Company ID is required' })
    }
    
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
        return await getCompany(supabase, id, res)
      case 'PATCH':
        return await updateCompany(supabase, id, req, res)
      case 'DELETE':
        return await deleteCompany(supabase, id, res)
      default:
        res.setHeader('Allow', ['GET', 'PATCH', 'DELETE'])
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    logger.error('Error in company admin API', error)
    return res.status(500).json(createSecureErrorResponse(error))
  }
}

async function getCompany(supabase: any, id: string, res: NextApiResponse) {
  try {
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
          created_at,
          auth_users:users(email)
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
        email: profile.auth_users?.email
      }))
    }

    return res.status(200).json({
      success: true,
      company: companyData
    })
  } catch (error) {
    logger.error('Error fetching company', error)
    return res.status(500).json(createSecureErrorResponse(error))
  }
}

async function updateCompany(supabase: any, id: string, req: NextApiRequest, res: NextApiResponse) {
  try {
    const { name, subdomain, plan_type, is_active, settings } = req.body

    // Build update object with only provided fields
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (subdomain !== undefined) {
      // Validate subdomain format
      if (!/^[a-z0-9-]+$/.test(subdomain)) {
        return res.status(400).json({
          error: 'Invalid subdomain',
          message: 'Subdomain must contain only lowercase letters, numbers, and hyphens'
        })
      }
      updateData.subdomain = subdomain
    }
    if (plan_type !== undefined) updateData.plan_type = plan_type
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

    return res.status(200).json({
      success: true,
      message: 'Company updated successfully',
      company
    })
  } catch (error) {
    logger.error('Error updating company', error)
    return res.status(500).json(createSecureErrorResponse(error))
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

    return res.status(200).json({
      success: true,
      message: 'Company deleted successfully'
    })
  } catch (error) {
    logger.error('Error deleting company', error)
    return res.status(500).json(createSecureErrorResponse(error))
  }
}
