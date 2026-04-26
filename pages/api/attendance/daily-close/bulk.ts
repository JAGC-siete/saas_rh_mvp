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

    const recordIds = Array.isArray(body.record_ids) ? body.record_ids.filter((x: unknown) => typeof x === 'string') : []
    if (recordIds.length === 0) {
      return res.status(400).json({ error: 'record_ids requerido' })
    }

    const admin = createAdminClient()

    const { data: records, error: recErr } = await admin
      .from('attendance_records')
      .select('id, employee_id, flags')
      .in('id', recordIds)

    if (recErr) {
      return res.status(500).json({ error: recErr.message })
    }
    if (!records || records.length === 0) {
      return res.status(404).json({ error: 'Registros no encontrados' })
    }

    const employeeIds = Array.from(new Set(records.map((r: any) => r.employee_id).filter(Boolean)))
    const { data: emps, error: empErr } = await admin
      .from('employees')
      .select('id, company_id')
      .in('id', employeeIds)

    if (empErr) {
      return res.status(500).json({ error: empErr.message })
    }

    const empCompany = new Map<string, string>()
    for (const e of emps || []) {
      empCompany.set((e as any).id, (e as any).company_id)
    }

    for (const r of records as any[]) {
      if (!r.employee_id || empCompany.get(r.employee_id) !== companyId) {
        return res.status(403).json({ error: 'Uno o más registros están fuera de la empresa' })
      }
    }

    const patchFlags =
      body.flags && typeof body.flags === 'object' && !Array.isArray(body.flags)
        ? (body.flags as Record<string, unknown>)
        : {}

    const updateFields: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (typeof body.check_in === 'string' || body.check_in === null) updateFields.check_in = body.check_in
    if (typeof body.check_out === 'string' || body.check_out === null) updateFields.check_out = body.check_out
    if (typeof body.lunch_start === 'string' || body.lunch_start === null) updateFields.lunch_start = body.lunch_start
    if (typeof body.lunch_end === 'string' || body.lunch_end === null) updateFields.lunch_end = body.lunch_end
    if (typeof body.justification === 'string') updateFields.justification = body.justification
    if (typeof body.status === 'string') updateFields.status = body.status

    let updated = 0
    for (const r of records as any[]) {
      const prevFlags = (r.flags || {}) as Record<string, unknown>
      const flags = {
        ...prevFlags,
        ...patchFlags,
        admin_override: true,
        close_state: 'draft',
      }

      const { error: upErr } = await admin
        .from('attendance_records')
        .update({ ...updateFields, flags })
        .eq('id', r.id)

      if (!upErr) updated++
    }

    return res.status(200).json({ success: true, updated })
  } catch (e) {
    if ((e as Error).message === 'UNAUTHORIZED' || (e as Error).message === 'PROFILE_REQUIRED') {
      return
    }
    console.error('daily-close bulk PATCH:', e)
    return res.status(500).json({
      error: 'Error al actualizar registros',
      message: e instanceof Error ? e.message : 'Error desconocido',
    })
  }
}

