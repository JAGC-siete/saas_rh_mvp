import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../lib/supabase/server'
import { requireUser } from '../../../lib/auth/requireUser'
import { getHondurasTimestamp } from '../../../lib/timezone'
import { requirePlanAndQuota, incrementUsage } from '../../../lib/billing/enforce'
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import { addEmployeeSyncJob } from '../../../lib/queues/employeeSyncQueue';
import { trace, context } from '@opentelemetry/api';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // AuthN + AuthZ: company_admin, hr_manager, super_admin
    const { supabase, user, userProfile } = await requireUser(req, res)
    
    if (!userProfile?.company_id) {
      return res.status(400).json({ 
        error: 'Perfil de usuario incompleto',
        message: 'No se pudo obtener la información de la empresa'
      })
    }

    const companyId = userProfile.company_id

    // Check plan and quota before processing
    await requirePlanAndQuota(supabase, companyId, 'create_employee')

    // Use admin client for database operations
    const adminSupabase = createAdminClient()

    // Validate required fields
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
      payment_frequency,
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
      department_id: department_id || null,
      work_schedule_id: work_schedule_id || null,
      base_salary: typeof base_salary === 'string' ? parseFloat(base_salary) : base_salary,
      payment_frequency: (payment_frequency === 'quincenal' || payment_frequency === 'mensual' || payment_frequency === 'semanal') ? payment_frequency : null,
      hire_date: hire_date || null,
      termination_date: termination_date || null,
      status,
      bank_name: bank_name || null,
      bank_account: bank_account || null,
      emergency_contact_name: emergency_contact_name || null,
      emergency_contact_phone: emergency_contact_phone || null,
      address: address || null,
      metadata: metadata || null,
      sync_status: 'pending', // Set status to pending on creation
      created_at: getHondurasTimestamp(),
      updated_at: getHondurasTimestamp()
    }

    const { data: newEmployee, error: insertError } = await adminSupabase
      .from('employees')
      .insert([employeeData])
      .select()
      .single()

    if (insertError) {
      console.error('Error creating employee (admin):', insertError)
      return res.status(500).json({ error: 'Error creating employee' })
    }

    // Increment usage meter
    try {
      await incrementUsage(supabase, companyId, 'create_employee')
    } catch (error) {
      console.warn('Failed to increment usage meter:', error)
      // Don't fail the request if usage tracking fails
    }

    // Log audit event
    try {
      // await auditEmployeeCreated(supabase, user.id, companyId, inserted.id) // This line was removed as per the new_code
    } catch (error) {
      console.warn('Failed to log audit event:', error)
      // Don't fail the request if audit fails
    }

    // Send the job to the queue after the response is sent
    res.on('finish', () => {
      if (newEmployee) {
        addEmployeeSyncJob(newEmployee.id);
      }
    });

    res.status(201).json(newEmployee);

  } catch (error: any) {
    console.error('Error in protected employee create API:', error)
    
    if (error.message === 'UNAUTHORIZED') {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    
    if (error.message === 'PROFILE_REQUIRED') {
      return res.status(403).json({ error: 'User profile required' })
    }

    if (error.message === 'PLAN_REQUIRED') {
      return res.status(402).json({ error: 'Active plan required to create employees' })
    }

    if (error.message === 'EMPLOYEE_LIMIT_REACHED') {
      return res.status(429).json({ error: 'Employee limit reached for this month' })
    }

    return res.status(500).json({ 
      error: error.message || 'Internal server error' 
    })
  }
}


