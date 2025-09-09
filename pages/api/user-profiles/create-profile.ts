import { NextApiRequest, NextApiResponse } from 'next'
import { authenticateUser } from '../../../lib/auth/api-auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Authenticate user but don't require profile (since they don't have one yet)
    const { supabase, user } = await authenticateUser(req, res, { requireProfile: false })

    const { 
      company_id, 
      employee_id, 
      role = 'employee', 
      permissions = {},
      is_active = true 
    } = req.body

    if (!company_id) {
      return res.status(400).json({ error: 'Company ID is required' })
    }

    // Validate role
    const validRoles = ['super_admin', 'company_admin', 'hr_manager', 'manager', 'employee']
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' })
    }

    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    if (existingProfile) {
      return res.status(409).json({ error: 'User profile already exists' })
    }

    // Create new user profile
    const { data: newProfile, error: createError } = await supabase
      .from('user_profiles')
      .insert([{
        id: user.id,
        company_id,
        employee_id: employee_id || null,
        role,
        permissions,
        is_active
      }])
      .select(`
        *,
        employees(name, email, position)
      `)
      .single()

    if (createError) {
      console.error('Error creating user profile:', createError)
      return res.status(500).json({ error: 'Failed to create user profile' })
    }

    return res.status(201).json({ 
      profile: newProfile,
      message: 'User profile created successfully' 
    })

  } catch (error: any) {
    console.error('Create profile API error:', error)
    
    if (error.message === 'UNAUTHORIZED') {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    
    return res.status(500).json({ 
      error: error.message || 'Internal server error' 
    })
  }
}
