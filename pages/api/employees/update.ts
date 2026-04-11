import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../lib/supabase/server'
import { authenticateUser } from '../../../lib/auth-utils'
import { getHondurasTimestamp } from '../../../lib/timezone'
import { addEmployeeSyncJob } from '../../../lib/queues/employeeSyncQueue'
import { secureLog, secureErrorLog } from '../../../lib/security/safe-logging'
import {
  isAllowedTerminationReasonCode,
  normalizeTerminationReasonDetail
} from '../../../lib/employees/termination-reasons'

/** Solo columnas permitidas vía API (evita mass-assignment). */
const ALLOWED_UPDATE_KEYS = new Set([
  'employee_code',
  'dni',
  'name',
  'email',
  'phone',
  'role',
  'team',
  'department_id',
  'work_schedule_id',
  'base_salary',
  'hire_date',
  'termination_date',
  'status',
  'bank_name',
  'bank_account',
  'emergency_contact_name',
  'emergency_contact_phone',
  'address',
  'metadata',
  'payment_frequency',
  'pay_type',
  'quincena_config',
  'termination_reason_code',
  'termination_reason_detail'
])

function pickAllowedBody(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const key of Object.keys(body)) {
    if (ALLOWED_UPDATE_KEYS.has(key)) {
      out[key] = body[key]
    }
  }
  return out
}

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

    const auth = await authenticateUser(req, res, ['can_manage_employees'])
    if (!auth.success) {
      const status = auth.error === 'Permisos insuficientes' ? 403 : 401
      secureLog('Auth failed', { error: auth.error, status })
      return res.status(status).json({ error: auth.error, message: auth.message })
    }

    const companyId = auth.userProfile?.company_id
    if (!companyId) {
      secureLog('No company_id found in user profile')
      return res.status(400).json({ error: 'User profile not found or no company assigned' })
    }

    const supabase = createAdminClient()

    const { id } = (req.query || {}) as { id?: string }
    const body = (req.body || {}) as Record<string, unknown>

    if (!id && !body.id) {
      secureLog('No employee ID provided')
      return res.status(400).json({ error: 'Employee id is required' })
    }
    const employeeId = (id || body.id) as string

    secureLog('Updating employee', { employeeId, companyId })

    const { data: existing, error: fetchErr } = await supabase
      .from('employees')
      .select('id, company_id, status, termination_reason_code')
      .eq('id', employeeId)
      .single()

    if (fetchErr || !existing) {
      secureLog('Employee not found or fetch error', { employeeId, error: fetchErr?.message })
      return res.status(404).json({ error: 'Employee not found' })
    }
    if (existing.company_id !== companyId) {
      secureLog('Access denied: Employee does not belong to your company', {
        employeeId,
        existingCompanyId: existing.company_id
      })
      return res.status(403).json({ error: 'Access denied: Employee does not belong to your company' })
    }

    const updateData = pickAllowedBody(body) as Record<string, unknown>

    if ('termination_reason_code' in updateData) {
      const c = updateData.termination_reason_code
      if (c === '' || c === null) {
        updateData.termination_reason_code = null
      } else if (typeof c === 'string') {
        const t = c.trim()
        if (!t) {
          updateData.termination_reason_code = null
        } else if (!isAllowedTerminationReasonCode(t)) {
          return res.status(400).json({
            error: 'termination_reason_code inválido',
            message: 'Use un código de motivo de baja permitido.'
          })
        } else {
          updateData.termination_reason_code = t
        }
      }
    }

    if ('termination_reason_detail' in updateData) {
      updateData.termination_reason_detail = normalizeTerminationReasonDetail(
        updateData.termination_reason_detail
      )
    }

    if ('payment_frequency' in updateData) {
      const pf = updateData.payment_frequency
      updateData.payment_frequency =
        pf === 'quincenal' || pf === 'mensual' || pf === 'semanal' ? pf : null
    }

    const existingStatus = (existing.status as string) || 'active'
    const nextStatus =
      updateData.status !== undefined && updateData.status !== null
        ? String(updateData.status)
        : existingStatus

    if (nextStatus === 'active') {
      updateData.termination_reason_code = null
      updateData.termination_reason_detail = null
      updateData.termination_date = null
    } else if (nextStatus === 'inactive') {
      const transitioningActiveToInactive =
        existingStatus === 'active' &&
        updateData.status !== undefined &&
        String(updateData.status) === 'inactive'

      const reasonInPatch = 'termination_reason_code' in updateData
      const patchedReason = updateData.termination_reason_code

      if (transitioningActiveToInactive) {
        const code =
          patchedReason !== null && patchedReason !== undefined ? String(patchedReason).trim() : ''
        if (!code || !isAllowedTerminationReasonCode(code)) {
          return res.status(400).json({
            error: 'Motivo de baja requerido',
            message:
              'Al marcar el empleado como inactivo debe enviarse termination_reason_code con un valor permitido.'
          })
        }
        updateData.termination_reason_code = code
      } else if (reasonInPatch) {
        const code =
          patchedReason === null || patchedReason === undefined
            ? ''
            : String(patchedReason).trim()
        if (!code || !isAllowedTerminationReasonCode(code)) {
          return res.status(400).json({
            error: 'Motivo de baja inválido',
            message: 'termination_reason_code debe ser un código permitido y no vacío.'
          })
        }
        updateData.termination_reason_code = code
      }
    }

    const newEmployeeCode = updateData.employee_code
    if (newEmployeeCode !== undefined && newEmployeeCode !== null && String(newEmployeeCode).trim()) {
      const ec = String(newEmployeeCode).trim()
      const { data: dup, error: dupErr } = await supabase
        .from('employees')
        .select('id')
        .eq('company_id', companyId)
        .eq('employee_code', ec)
        .neq('id', employeeId)
        .single()
      if (!dupErr && dup) {
        secureLog('Employee code already exists', { employeeId, employeeCode: ec })
        return res.status(409).json({ error: 'Employee code already exists' })
      }
      if (dupErr && dupErr.code !== 'PGRST116') {
        secureErrorLog('Error checking existing employee', dupErr, { employeeId })
        return res.status(500).json({ error: 'Error checking existing employee' })
      }
    }

    delete updateData.id
    delete updateData.profile_image_path
    delete updateData.profile_image_meta

    updateData.sync_status = 'pending'
    updateData.updated_at = getHondurasTimestamp()

    secureLog('Final update data prepared', {
      fieldsCount: Object.keys(updateData).length,
      hasStatus: updateData.status !== undefined
    })

    const { data: updated, error: updErr } = await supabase
      .from('employees')
      .update(updateData as any)
      .eq('id', employeeId)
      .select()
      .single()

    if (updErr) {
      secureErrorLog('Error updating employee', updErr, { employeeId, companyId })
      return res.status(500).json({ error: 'Error updating employee' })
    }

    secureLog('Employee updated successfully', { employeeId, companyId })

    res.status(200).json({ employee: updated })

    res.on('finish', () => {
      addEmployeeSyncJob(updated.id)
    })
  } catch (error) {
    secureErrorLog('Error in protected employee update API', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
