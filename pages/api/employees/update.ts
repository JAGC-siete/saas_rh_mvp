import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../lib/supabase/server'
import { authenticateUser } from '../../../lib/auth-utils'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT' && req.method !== 'PATCH') {
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

    const { id } = (req.query || {}) as { id?: string }
    const body = req.body || {}

    if (!id && !body.id) {
      return res.status(400).json({ error: 'Employee id is required' })
    }
    const employeeId = id || body.id

    // Ensure the employee exists and belongs to the same company
    const { data: existing, error: fetchErr } = await supabase
      .from('employees')
      .select('id, company_id')
      .eq('id', employeeId)
      .single()

    if (fetchErr || !existing) {
      return res.status(404).json({ error: 'Employee not found' })
    }
    if (existing.company_id !== companyId) {
      return res.status(403).json({ error: 'Access denied: Employee does not belong to your company' })
    }

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
      status,
      bank_name,
      bank_account,
      emergency_contact_name,
      emergency_contact_phone,
      address,
      metadata
    } = body

    // If updating employee_code, ensure uniqueness within the company
    if (employee_code) {
      const { data: dup, error: dupErr } = await supabase
        .from('employees')
        .select('id')
        .eq('company_id', companyId)
        .eq('employee_code', employee_code)
        .neq('id', employeeId)
        .single()
      if (!dupErr && dup) {
        return res.status(409).json({ error: 'Employee code already exists' })
      }
      if (dupErr && dupErr.code !== 'PGRST116') {
        return res.status(500).json({ error: 'Error checking existing employee' })
      }
    }

    const updateData: any = {
      ...(employee_code !== undefined ? { employee_code } : {}),
      ...(dni !== undefined ? { dni } : {}),
      ...(name !== undefined ? { name } : {}),
      ...(email !== undefined ? { email: email || null } : {}),
      ...(phone !== undefined ? { phone: phone || null } : {}),
      ...(role !== undefined ? { role: role || null } : {}),
      ...(team !== undefined ? { team: team || null } : {}),
      ...(position !== undefined ? { position: position || null } : {}),
      ...(department_id !== undefined ? { department_id: department_id || null } : {}),
      ...(work_schedule_id !== undefined ? { work_schedule_id: work_schedule_id || null } : {}),
      ...(base_salary !== undefined ? { base_salary: typeof base_salary === 'string' ? parseFloat(base_salary) : base_salary } : {}),
      ...(hire_date !== undefined ? { hire_date: hire_date || null } : {}),
      ...(termination_date !== undefined ? { termination_date: termination_date || null } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(bank_name !== undefined ? { bank_name: bank_name || null } : {}),
      ...(bank_account !== undefined ? { bank_account: bank_account || null } : {}),
      ...(emergency_contact_name !== undefined ? { emergency_contact_name: emergency_contact_name || null } : {}),
      ...(emergency_contact_phone !== undefined ? { emergency_contact_phone: emergency_contact_phone || null } : {}),
      ...(address !== undefined ? { address: address || null } : {}),
      ...(metadata !== undefined ? { metadata: metadata || null } : {}),
      updated_at: new Date().toISOString()
    }

    const { data: updated, error: updErr } = await supabase
      .from('employees')
      .update(updateData)
      .eq('id', employeeId)
      .select()
      .single()

    if (updErr) {
      console.error('Error updating employee (admin):', updErr)
      return res.status(500).json({ error: 'Error updating employee' })
    }

    return res.status(200).json({ message: 'Employee updated successfully', employee: updated })
  } catch (error) {
    console.error('Error in protected employee update API:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}


