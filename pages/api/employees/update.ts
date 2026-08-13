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
import { resolveFieldAccessContext, type FieldAccessContext } from '../../../lib/security/field-access'
import {
  buildEmployeeWritePayload,
  shapeEmployee,
} from '../../../lib/security/shape-employee'
import { parseAttendanceRequiredInput } from '../../../lib/payroll/payroll-attendance-inclusion'
import { parseEmployeePayOvertimeInput } from '../../../lib/payroll/overtime-pay'

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
  'attendance_required',
  'pay_overtime',
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

async function applyFieldLevelWriteFilter(
  body: Record<string, unknown>,
  fieldCtx: FieldAccessContext
): Promise<Record<string, unknown>> {
  try {
    return buildEmployeeWritePayload(body, fieldCtx)
  } catch (err: any) {
    if (err?.message === 'INVALID_BASE_SALARY') {
      throw Object.assign(new Error('INVALID_BASE_SALARY'), { statusCode: 400 })
    }
    throw err
  }
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
    const fieldCtx = await resolveFieldAccessContext(auth.userProfile, supabase)

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
      .select('id, company_id, status, termination_reason_code, pay_type')
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

    const updateData = await applyFieldLevelWriteFilter(pickAllowedBody(body), fieldCtx)

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

    if ('pay_type' in updateData) {
      const pt = updateData.pay_type
      if (pt === '' || pt === null) {
        updateData.pay_type = null
      } else if (pt === 'fixed' || pt === 'hourly' || pt === 'admin_floor') {
        updateData.pay_type = pt
      } else {
        return res.status(400).json({
          error: 'pay_type inválido',
          message: "pay_type debe ser 'fixed', 'hourly', 'admin_floor' o null (default de la empresa)."
        })
      }
    }

    if ('attendance_required' in updateData) {
      updateData.attendance_required = parseAttendanceRequiredInput(updateData.attendance_required)
    }

    if ('pay_overtime' in updateData) {
      updateData.pay_overtime = parseEmployeePayOvertimeInput(updateData.pay_overtime)
    }

    const effectivePayTypeForAttendance =
      updateData.pay_type !== undefined
        ? (updateData.pay_type as string | null)
        : (existing as { pay_type?: string | null }).pay_type
    if (effectivePayTypeForAttendance === 'hourly' || effectivePayTypeForAttendance === 'admin_floor') {
      updateData.attendance_required = true
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

    res.on('finish', () => {
      addEmployeeSyncJob(updated.id)
    })

    return res.status(200).json({ employee: shapeEmployee(updated, fieldCtx) })
  } catch (error: any) {
    if (error?.message === 'INVALID_BASE_SALARY') {
      return res.status(400).json({
        error: 'Invalid base_salary',
        message: 'El salario base debe ser un número válido mayor a cero.',
      })
    }
    secureErrorLog('Error in protected employee update API', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
