import { NextApiRequest, NextApiResponse } from 'next'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Create Supabase client
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    )

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
      department_id, 
      work_schedule_id, 
      position, 
      salary, 
      hire_date, 
      status = 'active' 
    } = req.body

    if (!employee_code || !dni || !name) {
      return res.status(400).json({ 
        error: 'Missing required fields: employee_code, dni, and name are required' 
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
      department_id: department_id || null,
      work_schedule_id: work_schedule_id || null,
      position: position || null,
      salary: salary ? parseFloat(salary) : null,
      hire_date: hire_date || null,
      status,
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