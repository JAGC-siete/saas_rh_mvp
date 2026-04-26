import { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../../lib/auth/api-auth-fixed'
import { createAdminClient } from '../../../../lib/supabase/server'
import { resolveCompanyIdForDailyClose } from '../../../../lib/attendance/daily-close'
import { calculateAttendanceHoursForCompanyAndDate } from '../../../../lib/attendance/calculate-hours'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { role, companyId: profileCid, userProfile } = await requireCompanyAccess(req, res)
    if (!['super_admin', 'company_admin', 'hr_manager'].includes(role)) {
      return res.status(403).json({ error: 'Permisos insuficientes' })
    }

    const body = req.body || {}
    const date = typeof body.date === 'string' ? body.date : ''
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Body date requerido (YYYY-MM-DD)' })
    }

    const companyId = resolveCompanyIdForDailyClose(
      role,
      profileCid,
      typeof body.company_id === 'string' ? body.company_id : undefined
    )
    if (!companyId) {
      return res.status(400).json({ error: 'company_id requerido' })
    }

    const admin = createAdminClient()
    const { data: emps } = await admin
      .from('employees')
      .select('id')
      .eq('company_id', companyId)
      .eq('status', 'active')

    const empIds = (emps || []).map((e: { id: string }) => e.id)
    if (empIds.length === 0) {
      return res.status(200).json({ success: true, finalized: 0, calculated: 0 })
    }

    let query = admin
      .from('attendance_records')
      .select('id, flags')
      .eq('date', date)
      .in('employee_id', empIds)

    if (Array.isArray(body.record_ids) && body.record_ids.length > 0) {
      query = query.in(
        'id',
        body.record_ids.filter((x: unknown) => typeof x === 'string')
      )
    }

    const { data: records, error: recErr } = await query
    if (recErr) {
      return res.status(500).json({ error: recErr.message })
    }

    const now = new Date().toISOString()
    const approver =
      (userProfile as { employee_id?: string | null } | null)?.employee_id ?? null
    let finalized = 0

    for (const r of records || []) {
      const row = r as { id: string; flags: Record<string, unknown> | null }
      const flags = { ...(row.flags || {}) }
      flags.close_state = 'finalized'
      flags.finalized_at = now
      if (approver) flags.finalized_by = approver

      const { error: upErr } = await admin
        .from('attendance_records')
        .update({
          flags,
          approved_at: now,
          approved_by: approver,
          updated_at: now,
        })
        .eq('id', row.id)

      if (!upErr) finalized++
    }

    const calculated = await calculateAttendanceHoursForCompanyAndDate(companyId, date, admin)

    return res.status(200).json({
      success: true,
      date,
      finalized,
      calculated_hours_rows: calculated,
    })
  } catch (e) {
    if ((e as Error).message === 'UNAUTHORIZED' || (e as Error).message === 'PROFILE_REQUIRED') {
      return
    }
    console.error('daily-close finalize:', e)
    return res.status(500).json({
      error: 'Error al finalizar cierre',
      message: e instanceof Error ? e.message : 'Error desconocido',
    })
  }
}
