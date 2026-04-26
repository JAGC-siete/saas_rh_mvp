import type { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../../lib/auth/api-auth-fixed'
import { createAdminClient } from '../../../../lib/supabase/server'

type Status = 'pending' | 'approved' | 'rejected'

function isUuid(v: unknown): v is string {
  return typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = typeof req.query.id === 'string' ? req.query.id : ''
  if (!isUuid(id)) return res.status(400).json({ error: 'ID inválido' })

  if (req.method === 'GET') return handleGet(req, res, id)
  if (req.method === 'PATCH') return handlePatch(req, res, id)

  res.setHeader('Allow', ['GET', 'PATCH'])
  return res.status(405).json({ error: 'Method not allowed' })
}

async function handleGet(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    const { role, companyId, userProfile } = await requireCompanyAccess(req, res)
    const admin = createAdminClient()

    const effectiveCompanyId =
      role === 'super_admin'
        ? typeof req.query.company_id === 'string'
          ? req.query.company_id
          : null
        : companyId
    if (!effectiveCompanyId) return res.status(400).json({ error: 'company_id requerido' })

    const isEmployee = role === 'employee'
    const employeeIdFromProfile = typeof userProfile?.employee_id === 'string' ? userProfile.employee_id : null

    let q = admin
      .from('attendance_corrections')
      .select('*')
      .eq('id', id)
      .eq('company_id', effectiveCompanyId)
      .maybeSingle()

    const { data, error } = await q
    if (error) return res.status(500).json({ error: error.message })
    if (!data) return res.status(404).json({ error: 'No encontrado' })

    if (isEmployee && employeeIdFromProfile && data.employee_id !== employeeIdFromProfile) {
      return res.status(403).json({ error: 'Acceso denegado' })
    }

    return res.status(200).json({ success: true, data })
  } catch (e) {
    if ((e as Error).message === 'UNAUTHORIZED' || (e as Error).message === 'PROFILE_REQUIRED') return
    return res.status(500).json({ error: 'Error obteniendo corrección', message: e instanceof Error ? e.message : 'Error desconocido' })
  }
}

async function handlePatch(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    const { role, companyId, userProfile } = await requireCompanyAccess(req, res)
    const admin = createAdminClient()

    const effectiveCompanyId =
      role === 'super_admin'
        ? typeof req.body?.company_id === 'string'
          ? req.body.company_id
          : typeof req.query.company_id === 'string'
            ? req.query.company_id
            : null
        : companyId
    if (!effectiveCompanyId) return res.status(400).json({ error: 'company_id requerido' })

    const employeeIdReviewer = typeof userProfile?.employee_id === 'string' ? userProfile.employee_id : null
    const isAdmin = ['super_admin', 'company_admin', 'hr_manager', 'manager', 'admin'].includes(role)

    const body = req.body || {}
    const action = typeof body.action === 'string' ? body.action : ''
    if (!['approve', 'reject'].includes(action)) return res.status(400).json({ error: 'action requerido (approve|reject)' })

    if (!isAdmin) {
      return res.status(403).json({ error: 'Permisos insuficientes' })
    }

    const { data: corr, error: corrErr } = await admin
      .from('attendance_corrections')
      .select('*')
      .eq('id', id)
      .eq('company_id', effectiveCompanyId)
      .maybeSingle()

    if (corrErr) return res.status(500).json({ error: corrErr.message })
    if (!corr) return res.status(404).json({ error: 'No encontrado' })
    if (corr.status !== 'pending') return res.status(409).json({ error: 'La corrección ya fue procesada' })

    const reviewer_note = typeof body.reviewer_note === 'string' ? body.reviewer_note.trim() : null

    if (action === 'reject') {
      const { data: updated, error } = await admin
        .from('attendance_corrections')
        .update({
          status: 'rejected' as Status,
          reviewed_by: employeeIdReviewer,
          reviewed_at: new Date().toISOString(),
          reviewer_note,
          after_snapshot: null,
        })
        .eq('id', id)
        .select('*')
        .single()
      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json({ success: true, data: updated })
    }

    // approve: apply to attendance_records (create if missing)
    const dateStr: string = corr.date
    const employeeId: string = corr.employee_id

    const { data: existing } = await admin
      .from('attendance_records')
      .select('id, employee_id, date, check_in, check_out, lunch_start, lunch_end, status, late_minutes, early_departure_minutes, flags')
      .eq('employee_id', employeeId)
      .eq('date', dateStr)
      .maybeSingle()

    const patch: any = {
      check_in: corr.proposed_check_in ?? existing?.check_in ?? null,
      check_out: corr.proposed_check_out ?? existing?.check_out ?? null,
      lunch_start: corr.proposed_lunch_start ?? existing?.lunch_start ?? null,
      lunch_end: corr.proposed_lunch_end ?? existing?.lunch_end ?? null,
    }

    let recordId = existing?.id as string | undefined
    let afterSnapshot: any = null

    if (recordId) {
      const { data: upd, error: updErr } = await admin
        .from('attendance_records')
        .update(patch)
        .eq('id', recordId)
        .select('id, employee_id, date, check_in, check_out, lunch_start, lunch_end, status, late_minutes, early_departure_minutes, flags')
        .single()
      if (updErr) return res.status(500).json({ error: updErr.message })
      afterSnapshot = upd
      recordId = upd.id
    } else {
      const { data: ins, error: insErr } = await admin
        .from('attendance_records')
        .insert({
          employee_id: employeeId,
          date: dateStr,
          ...patch,
          status: 'present',
        })
        .select('id, employee_id, date, check_in, check_out, lunch_start, lunch_end, status, late_minutes, early_departure_minutes, flags')
        .single()
      if (insErr) return res.status(500).json({ error: insErr.message })
      afterSnapshot = ins
      recordId = ins.id
    }

    // Recalculate hours if record is complete (check_in/check_out)
    let recalculated = 0
    if (afterSnapshot?.check_in && afterSnapshot?.check_out) {
      const { data: results, error: rpcErr } = await admin.rpc('calculate_attendance_hours_batch', {
        p_record_ids: [recordId],
        p_law_year: new Date(`${dateStr}T00:00:00.000Z`).getUTCFullYear(),
      })
      if (rpcErr) return res.status(500).json({ error: rpcErr.message })
      recalculated = Array.isArray(results) ? results.length : 0
    }

    const { data: updated, error } = await admin
      .from('attendance_corrections')
      .update({
        status: 'approved' as Status,
        reviewed_by: employeeIdReviewer,
        reviewed_at: new Date().toISOString(),
        reviewer_note,
        attendance_record_id: recordId,
        after_snapshot: afterSnapshot,
      })
      .eq('id', id)
      .select('*')
      .single()
    if (error) return res.status(500).json({ error: error.message })

    return res.status(200).json({ success: true, data: updated, applied_record_id: recordId, recalculated })
  } catch (e) {
    if ((e as Error).message === 'UNAUTHORIZED' || (e as Error).message === 'PROFILE_REQUIRED') return
    return res.status(500).json({ error: 'Error procesando corrección', message: e instanceof Error ? e.message : 'Error desconocido' })
  }
}

