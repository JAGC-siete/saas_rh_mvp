import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../lib/supabase/server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({ error: 'Email is required' })
    }

    const supabase = createAdminClient()

    // Find the user in auth.users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      console.error('Error fetching auth users:', authError)
      return res.status(500).json({ error: 'Failed to fetch auth users' })
    }
    
    const user = authUsers.users.find(u => u.email === email)
    
    if (!user) {
      return res.status(404).json({ error: 'User not found in Supabase Auth' })
    }

    // Check if user profile already exists
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (existingProfile) {
      return res.status(409).json({ 
        error: 'User profile already exists',
        profile: existingProfile
      })
    }

    // Find the employee record
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('*')
      .eq('email', email)

    if (empError) {
      console.error('Error fetching employees:', empError)
      return res.status(500).json({ error: 'Failed to fetch employee data' })
    }

    if (!employees || employees.length === 0) {
      return res.status(404).json({ error: 'Employee record not found' })
    }

    const employee = employees[0]

    // Create the user profile
    const { data: newProfile, error: createError } = await supabase
      .from('user_profiles')
      .insert([{
        id: user.id,
        company_id: employee.company_id,
        employee_id: employee.id,
        role: 'hr_manager', // Default role, can be customized
        permissions: {
          "can_manage_employees": true,
          "can_view_payroll": true,
          "can_manage_attendance": true,
          "can_manage_departments": true,
          "can_view_reports": true,
          "can_generate_payroll": true,
          "can_export_payroll": true,
          "can_view_own_attendance": true,
          "can_register_attendance": true
        },
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select(`
        *,
        employees(name, email, role),
        companies(name, is_active)
      `)
      .single()

    if (createError) {
      console.error('Error creating user profile:', createError)
      return res.status(500).json({ error: 'Failed to create user profile' })
    }

    // Normalize null role to empty string
    const normalizedProfile = newProfile ? {
      ...newProfile,
      employees: newProfile.employees ? {
        ...newProfile.employees,
        role: newProfile.employees.role ?? ''
      } : null
    } : newProfile

    return res.status(201).json({
      message: 'User profile created successfully',
      profile: normalizedProfile
    })

  } catch (error: any) {
    console.error('Fix user profile error:', error)
    return res.status(500).json({ 
      error: error.message || 'Internal server error' 
    })
  }
}
