import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../lib/supabase/server'
import { authenticateUser } from '../../../lib/auth-utils'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // AuthN + AuthZ: company_admin, hr_manager, super_admin
    const auth = await authenticateUser(req, res, ['can_manage_employees'])
    if (!auth.success) {
      const status = auth.error === 'Permisos insuficientes' ? 403 : 401
      return res.status(status).json({ error: auth.error, message: auth.message })
    }

    const companyId = auth.userProfile?.company_id
    if (!companyId) {
      return res.status(400).json({ error: 'User profile not found or no company assigned' })
    }

    const supabase = createAdminClient()

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
    } = req.body || {}

    if (!employee_code || !dni || !name || base_salary === undefined || base_salary === null) {
      return res.status(400).json({
        error: 'Missing required fields: employee_code, dni, name, and base_salary are required'
      })
    }

    // Enforce duplicate code check per company
    const { data: existing, error: dupErr } = await supabase
      .from('employees')
      .select('id')
      .eq('company_id', companyId)
      .eq('employee_code', employee_code)
      .single()

    if (dupErr && dupErr.code !== 'PGRST116') {
      return res.status(500).json({ error: 'Error checking existing employee' })
    }
    if (existing) {
      return res.status(409).json({ error: 'Employee code already exists' })
    }

    const employeeData: any = {
      company_id: companyId,
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
      base_salary: typeof base_salary === 'string' ? parseFloat(base_salary) : base_salary,
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

    const { data: inserted, error: insertError } = await supabase
      .from('employees')
      .insert([employeeData])
      .select()
      .single()

    if (insertError) {
      console.error('Error creating employee (admin):', insertError)
      return res.status(500).json({ error: 'Error creating employee' })
    }

    return res.status(201).json({ message: 'Employee created successfully', employee: inserted })
  } catch (error) {
    console.error('Error in protected employee create API:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}


