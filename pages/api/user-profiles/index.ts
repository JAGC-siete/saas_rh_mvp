import { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess, requireAdmin } from "../../../lib/auth/api-auth-fixed"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { supabase, companyId, role, user } = await requireCompanyAccess(req, res)

    switch (req.method) {
      case 'GET':
        // Get all user profiles in the company
        // For super_admin without companyId, return only their own profile
        let query = supabase
          .from('user_profiles')
          .select(`
            *,
            employees(name, email, role)
          `)
        
        if (role === 'super_admin' && !companyId) {
          // Super admin without company: return only their own profile
          query = query.eq('id', user.id)
        } else if (companyId) {
          // Regular users: filter by company
          query = query.eq('company_id', companyId)
        } else {
          // Should not happen, but handle gracefully
          return res.status(400).json({ error: 'Company access required' })
        }
        
        const { data: profiles, error: fetchError } = await query
          .order('created_at', { ascending: false })

        if (fetchError) throw fetchError
        
        // Normalize null role to empty string for frontend safety
        const normalizedProfiles = profiles?.map((profile: any) => ({
          ...profile,
          employees: profile.employees ? {
            ...profile.employees,
            role: profile.employees.role ?? ''
          } : null
        })) || []
        
        return res.json({ profiles: normalizedProfiles })

      case 'POST':
        // Only admins can create user profiles
        if (!['super_admin', 'company_admin'].includes(role)) {
          return res.status(403).json({ error: 'Admin privileges required' })
        }

        const { 
          user_id, 
          employee_id, 
          role: userRole, 
          permissions = {},
          is_active = true 
        } = req.body

        if (!user_id || !userRole) {
          return res.status(400).json({ error: 'User ID and role are required' })
        }

        // Validate role
        const validRoles = ['super_admin', 'company_admin', 'hr_manager', 'manager', 'employee']
        if (!validRoles.includes(userRole)) {
          return res.status(400).json({ error: 'Invalid role' })
        }

        const { data: newProfile, error: createError } = await supabase
          .from('user_profiles')
          .insert([{
            id: user_id,
            company_id: companyId,
            employee_id: employee_id || null,
            role: userRole,
            permissions,
            is_active
          }])
          .select(`
            *,
            employees(name, email, role)
          `)
          .single()

        if (createError) throw createError
        
        // Normalize null role to empty string
        const normalizedProfile = newProfile ? {
          ...newProfile,
          employees: newProfile.employees ? {
            ...newProfile.employees,
            role: newProfile.employees.role ?? ''
          } : null
        } : newProfile
        
        return res.status(201).json({ profile: normalizedProfile })

      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error: any) {
    console.error('User profiles API error:', error)
    
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
