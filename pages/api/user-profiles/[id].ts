import { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess, requireAdmin } from "../../../lib/auth/api-auth-fixed"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { supabase, companyId, role } = await requireCompanyAccess(req, res)
    const { id } = req.query

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'User ID is required' })
    }

    switch (req.method) {
      case 'GET': {
        // Get specific user profile
        const { data: profile, error: fetchError } = await supabase
          .from('user_profiles')
          .select(`
            *,
            employees(name, email, role)
          `)
          .eq('id', id)
          .eq('company_id', companyId)
          .single()

        if (fetchError) {
          if (fetchError.code === 'PGRST116') {
            return res.status(404).json({ error: 'User profile not found' })
          }
          throw fetchError
        }

        // Normalize null role to empty string
        const normalizedProfile = profile ? {
          ...profile,
          employees: profile.employees ? {
            ...profile.employees,
            role: profile.employees.role ?? ''
          } : null
        } : profile

        return res.json({ profile: normalizedProfile })
      }

      case 'PUT': {
        // Update user profile
        const { 
          role: newRole, 
          permissions, 
          is_active,
          employee_id 
        } = req.body

        // Only admins can update profiles, or users can update their own
        if (!['super_admin', 'company_admin'].includes(role) && id !== req.headers['x-user-id']) {
          return res.status(403).json({ error: 'Insufficient permissions' })
        }

        const updateData: any = {}
        if (newRole) {
          const validRoles = ['super_admin', 'company_admin', 'hr_manager', 'manager', 'employee']
          if (!validRoles.includes(newRole)) {
            return res.status(400).json({ error: 'Invalid role' })
          }
          updateData.role = newRole
        }
        if (permissions !== undefined) updateData.permissions = permissions
        if (is_active !== undefined) updateData.is_active = is_active
        if (employee_id !== undefined) updateData.employee_id = employee_id

        const { data: updatedProfile, error: updateError } = await supabase
          .from('user_profiles')
          .update(updateData)
          .eq('id', id)
          .eq('company_id', companyId)
          .select(`
            *,
            employees(name, email, role)
          `)
          .single()

        if (updateError) {
          if (updateError.code === 'PGRST116') {
            return res.status(404).json({ error: 'User profile not found' })
          }
          throw updateError
        }

        // Normalize null role to empty string
        const normalizedProfile = updatedProfile ? {
          ...updatedProfile,
          employees: updatedProfile.employees ? {
            ...updatedProfile.employees,
            role: updatedProfile.employees.role ?? ''
          } : null
        } : updatedProfile

        return res.json({ profile: normalizedProfile })
      }

      case 'DELETE': {
        // Only super admins can delete profiles
        if (role !== 'super_admin') {
          return res.status(403).json({ error: 'Super admin privileges required' })
        }

        const { error: deleteError } = await supabase
          .from('user_profiles')
          .delete()
          .eq('id', id)
          .eq('company_id', companyId)

        if (deleteError) throw deleteError
        return res.status(204).end()
      }

      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error: any) {
    console.error('User profile API error:', error)
    
    if (error.message === 'UNAUTHORIZED') {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    if (error.message === 'PROFILE_REQUIRED') {
      return res.status(403).json({ error: 'User profile required' })
    }
    if (error.message === 'COMPANY_ACCESS_REQUIRED') {
      return res.status(400).json({ error: 'Company access required' })
    }
    
    return res.status(500).json({ 
      error: error.message || 'Internal server error' 
    })
  }
}
