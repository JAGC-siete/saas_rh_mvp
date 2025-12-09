import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../lib/supabase/server'
import { authenticateUser } from '../../../lib/auth-utils'
import { getHondurasTimestamp } from '../../../lib/timezone'
import { addEmployeeSyncJob } from '../../../lib/queues/employeeSyncQueue';
import { trace, context } from '@opentelemetry/api';
import { normalizeEmployeeData } from '../../../lib/utils/normalize-employee-data';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT' && req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('🔧 Employee Update API - Iniciando...', {
      method: req.method,
      body: req.body,
      query: req.query
    })

    // AuthN + AuthZ: company_admin, hr_manager, super_admin
    const auth = await authenticateUser(req, res, ['can_manage_employees'])
    if (!auth.success) {
      const status = auth.error === 'Permisos insuficientes' ? 403 : 401
      console.log('❌ Auth failed:', { error: auth.error, status })
      return res.status(status).json({ error: auth.error, message: auth.message })
    }

    console.log('✅ Auth successful:', { userId: auth.user?.id, role: auth.userProfile?.role })

    const companyId = auth.userProfile?.company_id
    if (!companyId) {
      console.log('❌ No company_id found in user profile')
      return res.status(400).json({ error: 'User profile not found or no company assigned' })
    }

    const supabase = createAdminClient()

    const { id } = (req.query || {}) as { id?: string }
    const body = req.body || {}

    if (!id && !body.id) {
      console.log('❌ No employee ID provided')
      return res.status(400).json({ error: 'Employee id is required' })
    }
    const employeeId = id || body.id

    console.log('🔍 Updating employee:', { employeeId, companyId })

    // Ensure the employee exists and belongs to the same company
    const { data: existing, error: fetchErr } = await supabase
      .from('employees')
      .select('id, company_id')
      .eq('id', employeeId)
      .single()

    if (fetchErr || !existing) {
      console.log('❌ Employee not found or fetch error:', { employeeId, fetchErr })
      return res.status(404).json({ error: 'Employee not found' })
    }
    if (existing.company_id !== companyId) {
      console.log('❌ Access denied: Employee does not belong to your company', { employeeId, existingCompanyId: existing.company_id })
      return res.status(403).json({ error: 'Access denied: Employee does not belong to your company' })
    }

    console.log('✅ Employee found and access granted:', { employeeId, existingCompanyId: existing.company_id })

    const {
      employee_code,
      dni,
      name,
      email,
      phone,
      role,
      team,
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

    console.log('📝 Update data received:', {
      employee_code: !!employee_code,
      dni: !!dni,
      name: !!name,
      status: status,
      termination_date: termination_date,
      hasOtherFields: !!(email || phone || role || team || department_id || work_schedule_id || base_salary || hire_date || bank_name || bank_account || emergency_contact_name || emergency_contact_phone || address || metadata)
    })

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
        console.log('❌ Employee code already exists:', { employeeId, employeeCode: employee_code })
        return res.status(409).json({ error: 'Employee code already exists' })
      }
      if (dupErr && dupErr.code !== 'PGRST116') {
        console.error('❌ Error checking existing employee:', dupErr)
        return res.status(500).json({ error: 'Error checking existing employee' })
      }
    }

    // Validate pay_type if provided
    if (body.pay_type && !['fixed', 'hourly'].includes(body.pay_type)) {
      console.log('❌ Invalid pay_type:', { pay_type: body.pay_type })
      return res.status(400).json({ error: 'Invalid pay_type. Must be "fixed" or "hourly"' })
    }

    // Normalize employee data (handles empty strings, date formatting, etc.)
    const updateData = normalizeEmployeeData(body);
    updateData.updated_at = getHondurasTimestamp();

    console.log('🔧 Final update data:', updateData)

    let updated: any = null
    let updErr: any = null

    // Try to include sync_status, but handle gracefully if column doesn't exist
    updateData.sync_status = 'pending'; // Mark for sync on any update

    const { data: updateResult, error: updateError } = await supabase
      .from('employees')
      .update(updateData)
      .eq('id', employeeId)
      .select()
      .single()

    updErr = updateError
    updated = updateResult

    // If error is about sync_status column not found, retry without it
    if (updErr && updErr.message && (updErr.message.includes('sync_status') || updErr.code === 'PGRST204')) {
      console.warn('⚠️ sync_status column not found, retrying update without it')
      const updateDataWithoutSync = { ...updateData }
      delete updateDataWithoutSync.sync_status
      
      const { data: retryResult, error: retryErr } = await supabase
        .from('employees')
        .update(updateDataWithoutSync)
        .eq('id', employeeId)
        .select()
        .single()
      
      if (retryErr) {
        console.error('❌ Error updating employee (admin):', retryErr)
        return res.status(500).json({ error: 'Error updating employee', details: retryErr.message })
      }
      
      updated = retryResult
      updErr = null
    }

    if (updErr) {
      console.error('❌ Error updating employee (admin):', updErr)
      return res.status(500).json({ error: 'Error updating employee', details: updErr.message })
    }

    if (!updated) {
      console.error('❌ No data returned from update')
      return res.status(500).json({ error: 'Error updating employee: No data returned' })
    }

    console.log('✅ Employee updated successfully:', { employeeId, companyId });

    // Respond to the client immediately
    res.status(200).json({ employee: updated });

    // After the response has been sent, add the job to the queue
    res.on('finish', () => {
      addEmployeeSyncJob(updated.id);
    });

    // TODO: Log audit event
    // try {
    //   return res.status(200).json({ message: 'Employee updated successfully', employee: updated })
    // } catch (error) {
    //   console.error('❌ Error in protected employee update API:', error)
    //   return res.status(500).json({ error: 'Internal server error' })
    // }
  } catch (error) {
    console.error('❌ Error in protected employee update API:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}


