import { NextApiRequest, NextApiResponse } from 'next'
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Create Supabase client for Pages API
    const supabase = createServerSupabaseClient({ req, res })

    // Get user session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Validate required fields
    const { 
      employee_code, 
      dni, 
      name, 
      email, 
      phone, 
      role,
      team,
      position, 
      department_id, 
      work_schedule_id, 
      base_salary, 
      hire_date, 
      termination_date,
      status = 'active',
      bank_name,
      bank_account,
      emergency_contact_name,
      emergency_contact_phone,
      address,
      metadata
    } = req.body

    if (!employee_code || !dni || !name || !base_salary) {
      return res.status(400).json({ 
        error: 'Missing required fields: employee_code, dni, name, and base_salary are required' 
      })
    }

    // Check if employee code already exists
    const { data: existingEmployee, error: checkError } = await supabase
      .from('employees')
      .select('id')
      .eq('employee_code', employee_code)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      return res.status(500).json({ error: 'Error checking existing employee' })
    }

    if (existingEmployee) {
      return res.status(409).json({ error: 'Employee code already exists' })
    }

    // Get company_id from user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single()

    if (profileError || !userProfile?.company_id) {
      return res.status(400).json({ error: 'User profile not found or no company assigned' })
    }

    // Create employee data
    const employeeData = {
      company_id: userProfile.company_id,
      employee_code,
      dni,
      name,
      email: email || null,
      phone: phone || null,
      role: role || null,
      team: team || null,
      position: position || null,
      department_id: department_id || null,
      work_schedule_id: work_schedule_id || null,
      base_salary: parseFloat(base_salary),
      hire_date: hire_date || null,
      termination_date: termination_date || null,
      status,
      bank_name: bank_name || null,
      bank_account: bank_account || null,
      emergency_contact_name: emergency_contact_name || null,
      emergency_contact_phone: emergency_contact_phone || null,
      address: address || null,
      metadata: metadata || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Insert employee
    const { data: newEmployee, error: insertError } = await supabase
      .from('employees')
      .insert([employeeData])
      .select()
      .single()

    if (insertError) {
      console.error('Error creating employee:', insertError)
      return res.status(500).json({ error: 'Error creating employee' })
    }

    return res.status(201).json({ 
      message: 'Employee created successfully',
      employee: newEmployee 
    })

  } catch (error) {
    console.error('Error in employee creation API:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
} 