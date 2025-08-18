import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../lib/supabase/server'
import { authenticateUser } from '../../../lib/auth-utils'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Employee ID is required' })
  }

  if (req.method === 'PUT') {
    // Update employee
    try {
      // AuthN + AuthZ
      const auth = await authenticateUser(req, res, ['can_manage_employees'])
      if (!auth.success) {
        const status = auth.error === 'Permisos insuficientes' ? 403 : 401
        return res.status(status).json({ error: auth.error, message: auth.message })
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
        status,
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

      // Company context from authenticated user profile
      const companyId = auth.userProfile?.company_id
      if (!companyId) {
        return res.status(400).json({ error: 'User profile not found or no company assigned' })
      }

      // Check if employee exists and belongs to user's company
      const { data: existingEmployee, error: checkError } = await supabase
        .from('employees')
        .select('id, company_id, employee_code, name')
        .eq('id', id)
        .single()

      if (checkError || !existingEmployee) {
        console.error(`Employee not found: ${id}`)
        return res.status(404).json({ error: 'Employee not found' })
      }

      if (existingEmployee.company_id !== companyId) {
        console.error(`Access denied: Employee ${existingEmployee.name} (${existingEmployee.employee_code}) does not belong to user's company`)
        return res.status(403).json({ error: 'Access denied: Employee does not belong to your company' })
      }

      console.log(`✅ Permission granted: Updating employee ${existingEmployee.name} (${existingEmployee.employee_code})`)

      // Check if employee code already exists (excluding current employee)
      const { data: duplicateEmployee, error: duplicateError } = await supabase
        .from('employees')
        .select('id')
        .eq('employee_code', employee_code)
        .eq('company_id', companyId)
        .neq('id', id)
        .single()

      if (duplicateError && duplicateError.code !== 'PGRST116') {
        return res.status(500).json({ error: 'Error checking existing employee' })
      }

      if (duplicateEmployee) {
        return res.status(409).json({ error: 'Employee code already exists' })
      }

      // Update employee data
      const employeeData = {
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
        status: status || 'active',
        bank_name: bank_name || null,
        bank_account: bank_account || null,
        emergency_contact_name: emergency_contact_name || null,
        emergency_contact_phone: emergency_contact_phone || null,
        address: address || null,
        metadata: metadata || null,
        updated_at: new Date().toISOString()
      }

      // Update employee
      const { data: updatedEmployee, error: updateError } = await supabase
        .from('employees')
        .update(employeeData)
        .eq('id', id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating employee:', updateError)
        return res.status(500).json({ error: 'Error updating employee' })
      }

      return res.status(200).json({ 
        message: 'Employee updated successfully',
        employee: updatedEmployee 
      })

    } catch (error) {
      console.error('Error in employee update API:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  if (req.method === 'PATCH') {
    // Partial update (e.g., status change)
    try {
      // AuthN + AuthZ
      const auth = await authenticateUser(req, res, ['can_manage_employees'])
      if (!auth.success) {
        const status = auth.error === 'Permisos insuficientes' ? 403 : 401
        return res.status(status).json({ error: auth.error, message: auth.message })
      }
      const supabase = createAdminClient()

      // Company context from authenticated user profile
      const companyId = auth.userProfile?.company_id
      if (!companyId) {
        return res.status(400).json({ error: 'User profile not found or no company assigned' })
      }

      // Check if employee exists and belongs to user's company
      const { data: existingEmployee, error: checkError } = await supabase
        .from('employees')
        .select('id, company_id, employee_code, name')
        .eq('id', id)
        .single()

      if (checkError || !existingEmployee) {
        console.error(`Employee not found: ${id}`)
        return res.status(404).json({ error: 'Employee not found' })
      }

      if (existingEmployee.company_id !== companyId) {
        console.error(`Access denied: Employee ${existingEmployee.name} (${existingEmployee.employee_code}) does not belong to user's company`)
        return res.status(403).json({ error: 'Access denied: Employee does not belong to your company' })
      }

      console.log(`✅ Permission granted: Partial update for employee ${existingEmployee.name} (${existingEmployee.employee_code})`)

      // Update employee data (partial update)
      const updateData = {
        ...req.body,
        updated_at: new Date().toISOString()
      }

      // Update employee
      const { data: updatedEmployee, error: updateError } = await supabase
        .from('employees')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating employee:', updateError)
        return res.status(500).json({ error: 'Error updating employee' })
      }

      return res.status(200).json({ 
        message: 'Employee updated successfully',
        employee: updatedEmployee 
      })

    } catch (error) {
      console.error('Error in employee partial update API:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
} 