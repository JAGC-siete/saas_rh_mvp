import { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../../lib/auth/api-auth-fixed'
import { createAdminClient } from '../../../../lib/supabase/server'
import { resolveCompanyIdForDailyClose } from '../../../../lib/attendance/daily-close'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', 'PATCH')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { role, companyId: profileCid } = await requireCompanyAccess(req, res)
    if (!['super_admin', 'company_admin', 'hr_manager'].includes(role)) {
      return res.status(403).json({ error: 'Permisos insuficientes' })
    }

    const body = req.body || {}
    const companyId = resolveCompanyIdForDailyClose(
      role,
      profileCid,
      typeof body.company_id === 'string' ? body.company_id : undefined
    )
    if (!companyId) {
      return res.status(400).json({ error: 'company_id requerido' })
    }

    const recordId = typeof body.record_id === 'string' ? body.record_id : null
    const employeeId = typeof body.employee_id === 'string' ? body.employee_id : null
    const date = typeof body.date === 'string' ? body.date : null

    if (!recordId && (!employeeId || !date)) {
      return res.status(400).json({
        error: 'record_id o (employee_id + date) requerido',
      })
    }

    const admin = createAdminClient()

    type Rec = { id: string; employee_id: string; flags: unknown }
    let record: Rec
    if (recordId) {
      const { data, error } = await admin
        .from('attendance_records')
        .select('id, employee_id, flags')
        .eq('id', recordId)
        .maybeSingle()
      if (error || !data) {
        return res.status(404).json({ error: 'Registro no encontrado' })
      }
      record = data as Rec
    } else {
      const { data, error } = await admin
        .from('attendance_records')
        .select('id, employee_id, flags')
        .eq('employee_id', employeeId!)
        .eq('date', date!)
        .maybeSingle()
      if (error || !data) {
        return res.status(404).json({ error: 'Registro no encontrado' })
      }
      record = data as Rec
    }

    const { data: emp } = await admin
      .from('employees')
      .select('company_id')
      .eq('id', record!.employee_id)
      .single()

    if (!emp || emp.company_id !== companyId) {
      return res.status(403).json({ error: 'Registro fuera de la empresa' })
    }

    const prevFlags = (record.flags || {}) as Record<string, unknown>
    const patchFlags =
      body.flags && typeof body.flags === 'object' && !Array.isArray(body.flags)
        ? (body.flags as Record<string, unknown>)
        : {}

    const update: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      flags: {
        ...prevFlags,
        ...patchFlags,
        admin_override: true,
        close_state: 'draft',
      },
    }

    if (typeof body.check_in === 'string' || body.check_in === null) {
      update.check_in = body.check_in
    }
    if (typeof body.check_out === 'string' || body.check_out === null) {
      update.check_out = body.check_out
    }
    if (typeof body.lunch_start === 'string' || body.lunch_start === null) {
      update.lunch_start = body.lunch_start
    }
    if (typeof body.lunch_end === 'string' || body.lunch_end === null) {
      update.lunch_end = body.lunch_end
    }
    if (typeof body.justification === 'string') {
      update.justification = body.justification
    }
    if (typeof body.status === 'string') {
      update.status = body.status
    }

    const { data: updated, error: upErr } = await admin
      .from('attendance_records')
      .update(update)
      .eq('id', record.id)
      .select('*')
      .single()

    if (upErr) {
      return res.status(500).json({ error: upErr.message })
    }

    return res.status(200).json({ success: true, record: updated })
  } catch (e) {
    if ((e as Error).message === 'UNAUTHORIZED' || (e as Error).message === 'PROFILE_REQUIRED') {
      return
    }
    console.error('daily-close record PATCH:', e)
    return res.status(500).json({
      error: 'Error al actualizar registro',
      message: e instanceof Error ? e.message : 'Error desconocido',
    })
  }
}
