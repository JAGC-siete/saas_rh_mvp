import { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess, requireAdmin } from "../../../lib/auth/api-auth-fixed"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { supabase, companyId, role } = await requireCompanyAccess(req, res)

    switch (req.method) {
      case 'GET':
        // Get all user profiles in the company
        const { data: profiles, error: fetchError } = await supabase
          .from('user_profiles')
          .select(`
            *,
            employees(name, email)
          `)
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })

        if (fetchError) throw fetchError
        return res.json({ profiles })

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
            employees(name, email)
          `)
          .single()

        if (createError) throw createError
        return res.status(201).json({ profile: newProfile })

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
