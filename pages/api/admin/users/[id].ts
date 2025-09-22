import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../../lib/supabase/server'
import { logger } from '../../../../lib/logger'
import { createSecureErrorResponse, createAuthErrorResponse } from '../../../../lib/security/error-handling'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = createClient(req, res)
    const { id } = req.query

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'User ID is required' })
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
        return await getUser(supabase, id, res)
      case 'PATCH':
        return await updateUser(supabase, id, req, res)
      case 'DELETE':
        return await deleteUser(supabase, id, res)
      default:
        res.setHeader('Allow', ['GET', 'PATCH', 'DELETE'])
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    logger.error('Error in user admin API', error)
    return res.status(500).json(createSecureErrorResponse(error))
  }
}

async function getUser(supabase: any, id: string, res: NextApiResponse) {
  try {
    const { data: userProfile, error } = await supabase
      .from('user_profiles')
      .select(`
        id,
        role,
        is_active,
        permissions,
        last_login,
        created_at,
        updated_at,
        company_id,
        companies:companies(name, subdomain),
        auth_users:users(email, created_at, last_sign_in_at)
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'User not found' })
      }
      throw error
    }

    // Transform data
    const userData = {
      id: userProfile.id,
      email: userProfile.auth_users?.email,
      role: userProfile.role,
      is_active: userProfile.is_active,
      permissions: userProfile.permissions,
      last_login: userProfile.last_login || userProfile.auth_users?.last_sign_in_at,
      created_at: userProfile.created_at,
      updated_at: userProfile.updated_at,
      company: {
        id: userProfile.company_id,
        name: userProfile.companies?.name,
        subdomain: userProfile.companies?.subdomain
      }
    }

    return res.status(200).json({
      success: true,
      user: userData
    })
  } catch (error) {
    logger.error('Error fetching user', error)
    return res.status(500).json(createSecureErrorResponse(error))
  }
}

async function updateUser(supabase: any, id: string, req: NextApiRequest, res: NextApiResponse) {
  try {
    const { role, is_active, permissions, company_id } = req.body

    // Build update object with only provided fields
    const updateData: any = {}
    if (role !== undefined) {
      const validRoles = ['super_admin', 'company_admin', 'hr_manager', 'manager', 'employee']
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          error: 'Invalid role',
          message: `Role must be one of: ${validRoles.join(', ')}`
        })
      }
      updateData.role = role
    }
    if (is_active !== undefined) updateData.is_active = is_active
    if (permissions !== undefined) updateData.permissions = permissions
    if (company_id !== undefined) {
      // Verify company exists
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('id, is_active')
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
          message: 'Cannot assign users to inactive companies'
        })
      }

      updateData.company_id = company_id
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        error: 'No fields to update',
        message: 'At least one field must be provided'
      })
    }

    // Check if user exists
    const { data: existingUser, error: existingError } = await supabase
      .from('user_profiles')
      .select('id, role')
      .eq('id', id)
      .single()

    if (existingError || !existingUser) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Prevent demoting the last super admin
    if (existingUser.role === 'super_admin' && role && role !== 'super_admin') {
      const { data: superAdmins, error: superAdminError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('role', 'super_admin')
        .eq('is_active', true)

      if (superAdminError) {
        throw superAdminError
      }

      if (superAdmins.length <= 1) {
        return res.status(409).json({
          error: 'Cannot demote last super admin',
          message: 'There must be at least one active super admin in the system'
        })
      }
    }

    const { data: updatedUser, error } = await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('id', id)
      .select(`
        id,
        role,
        is_active,
        permissions,
        company_id,
        companies:companies(name)
      `)
      .single()

    if (error) {
      throw error
    }

    logger.info('User updated successfully', {
      userId: id,
      updatedFields: Object.keys(updateData)
    })

    return res.status(200).json({
      success: true,
      message: 'User updated successfully',
      user: updatedUser
    })
  } catch (error) {
    logger.error('Error updating user', error)
    return res.status(500).json(createSecureErrorResponse(error))
  }
}

async function deleteUser(supabase: any, id: string, res: NextApiResponse) {
  try {
    // Check if user exists and get role
    const { data: userProfile, error: userError } = await supabase
      .from('user_profiles')
      .select('id, role')
      .eq('id', id)
      .single()

    if (userError || !userProfile) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Prevent deleting the last super admin
    if (userProfile.role === 'super_admin') {
      const { data: superAdmins, error: superAdminError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('role', 'super_admin')
        .eq('is_active', true)

      if (superAdminError) {
        throw superAdminError
      }

      if (superAdmins.length <= 1) {
        return res.status(409).json({
          error: 'Cannot delete last super admin',
          message: 'There must be at least one active super admin in the system'
        })
      }
    }

    // Delete user profile first (will cascade due to foreign key)
    const { error: profileError } = await supabase
      .from('user_profiles')
      .delete()
      .eq('id', id)

    if (profileError) {
      throw profileError
    }

    // Delete from Supabase Auth
    const { error: authError } = await supabase.auth.admin.deleteUser(id)
    
    if (authError) {
      logger.warn('Failed to delete user from auth, but profile deleted', {
        userId: id,
        error: authError
      })
    }

    logger.info('User deleted successfully', { userId: id })

    return res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    })
  } catch (error) {
    logger.error('Error deleting user', error)
    return res.status(500).json(createSecureErrorResponse(error))
  }
}
