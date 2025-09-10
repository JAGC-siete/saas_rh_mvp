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
      company_name,
      company_id, 
      role = 'hr_manager', 
      permissions = {},
      is_active = true 
    } = req.body

    if (!company_name && !company_id) {
      return res.status(400).json({ error: 'Company name is required' })
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

    let finalCompanyId = company_id

    // If company_name is provided, create or find company
    if (company_name && !company_id) {
      // Generate a unique company ID
      const companyId = `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // Create new company
      const { data: newCompany, error: companyError } = await supabase
        .from('companies')
        .insert([{
          id: companyId,
          name: company_name,
          created_by: user.id,
          is_active: true,
          created_at: new Date().toISOString()
        }])
        .select('id')
        .single()

      if (companyError) {
        console.error('Error creating company:', companyError)
        return res.status(500).json({ error: 'Failed to create company' })
      }

      finalCompanyId = newCompany.id
    }

    // Generate automatic employee ID (EMP001 for first employee)
    const employeeId = 'EMP001'

    // Create new user profile
    const { data: newProfile, error: createError } = await supabase
      .from('user_profiles')
      .insert([{
        id: user.id,
        company_id: finalCompanyId,
        employee_id: employeeId,
        role,
        permissions,
        is_active
      }])
      .select(`
        *,
        employees(name, email, position),
        companies(name, is_active)
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
