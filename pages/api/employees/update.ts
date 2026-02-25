import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../lib/supabase/server'
import { authenticateUser } from '../../../lib/auth-utils'
import { getHondurasTimestamp } from '../../../lib/timezone'
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import { addEmployeeSyncJob } from '../../../lib/queues/employeeSyncQueue';
import { trace, context } from '@opentelemetry/api';
import { secureLog, secureErrorLog } from '../../../lib/security/safe-logging';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT' && req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    secureLog('Employee Update API - Iniciando', {
      method: req.method,
      hasBody: !!req.body,
      hasQuery: !!req.query
    })

    // AuthN + AuthZ: company_admin, hr_manager, super_admin
    const auth = await authenticateUser(req, res, ['can_manage_employees'])
    if (!auth.success) {
      const status = auth.error === 'Permisos insuficientes' ? 403 : 401
      secureLog('Auth failed', { error: auth.error, status })
      return res.status(status).json({ error: auth.error, message: auth.message })
    }

    secureLog('Auth successful', { userId: auth.user?.id, role: auth.userProfile?.role })

    const companyId = auth.userProfile?.company_id
    if (!companyId) {
      secureLog('No company_id found in user profile')
      return res.status(400).json({ error: 'User profile not found or no company assigned' })
    }

    const supabase = createAdminClient()

    const { id } = (req.query || {}) as { id?: string }
    const body = req.body || {}

    if (!id && !body.id) {
      secureLog('No employee ID provided')
      return res.status(400).json({ error: 'Employee id is required' })
    }
    const employeeId = id || body.id

    secureLog('Updating employee', { employeeId, companyId })

    // Ensure the employee exists and belongs to the same company
    const { data: existing, error: fetchErr } = await supabase
      .from('employees')
      .select('id, company_id')
      .eq('id', employeeId)
      .single()

    if (fetchErr || !existing) {
      secureLog('Employee not found or fetch error', { employeeId, error: fetchErr?.message })
      return res.status(404).json({ error: 'Employee not found' })
    }
    if (existing.company_id !== companyId) {
      secureLog('Access denied: Employee does not belong to your company', { employeeId, existingCompanyId: existing.company_id })
      return res.status(403).json({ error: 'Access denied: Employee does not belong to your company' })
    }

    secureLog('Employee found and access granted', { employeeId, existingCompanyId: existing.company_id })

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

    secureLog('Update data received', {
      hasEmployeeCode: !!employee_code,
      hasDni: !!dni,
      hasName: !!name,
      status: status,
      hasTerminationDate: !!termination_date,
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
        secureLog('Employee code already exists', { employeeId, employeeCode: employee_code })
        return res.status(409).json({ error: 'Employee code already exists' })
      }
      if (dupErr && dupErr.code !== 'PGRST116') {
        secureErrorLog('Error checking existing employee', dupErr, { employeeId })
        return res.status(500).json({ error: 'Error checking existing employee' })
      }
    }

    const updateData: any = { ...body };
    delete updateData.id; // Remove id from body to prevent trying to update it
    delete updateData.profile_image_path; // Remove profile_image_path - use employee_files instead
    delete updateData.profile_image_meta; // Remove profile_image_meta - use employee_files instead
    // payment_frequency: solo 'quincenal' | 'mensual' | 'semanal' | null
    if ('payment_frequency' in updateData) {
      const pf = updateData.payment_frequency
      updateData.payment_frequency = (pf === 'quincenal' || pf === 'mensual' || pf === 'semanal') ? pf : null
    }
    updateData.sync_status = 'pending'; // Mark for sync on any update
    updateData.updated_at = getHondurasTimestamp();

    secureLog('Final update data prepared', { 
      fieldsCount: Object.keys(updateData).length,
      hasStatus: !!updateData.status
    })

    const { data: updated, error: updErr } = await supabase
      .from('employees')
      .update(updateData)
      .eq('id', employeeId)
      .select()
      .single()

    if (updErr) {
      secureErrorLog('Error updating employee', updErr, { employeeId, companyId })
      return res.status(500).json({ error: 'Error updating employee' })
    }

    secureLog('Employee updated successfully', { employeeId, companyId });

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
    secureErrorLog('Error in protected employee update API', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}


