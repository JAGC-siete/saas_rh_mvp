import type { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../../lib/auth/api-auth-fixed'
import { getResolvedAttendanceConfig } from '../../../../lib/attendance/attendance-metadata'
import {
  buildApprovedAttendancePatch,
  getCorrectionDateAnchorError,
} from '../../../../lib/attendance/correction-marks'
import { resolveEffectiveWorkScheduleId } from '../../../../lib/attendance/effective-work-schedule'
import { getScheduleTimesForDate } from '../../../../lib/attendance/schedule-times'
import {
  getAttendanceMarksValidationError,
  humanizeAttendanceHoursCalcError,
} from '../../../../lib/attendance/validate-marks'
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

    const dateAnchorErr = getCorrectionDateAnchorError({
      date: dateStr,
      check_in: corr.proposed_check_in,
      check_out: corr.proposed_check_out,
      lunch_start: corr.proposed_lunch_start,
      lunch_end: corr.proposed_lunch_end,
    })
    if (dateAnchorErr) return res.status(400).json({ error: dateAnchorErr })

    const { data: existing } = await admin
      .from('attendance_records')
      .select('id, employee_id, date, check_in, check_out, lunch_start, lunch_end, status, late_minutes, early_departure_minutes, flags')
      .eq('employee_id', employeeId)
      .eq('date', dateStr)
      .maybeSingle()

    const { data: emp } = await admin
      .from('employees')
      .select('work_schedule_id')
      .eq('id', employeeId)
      .maybeSingle()

    const { timezone } = await getResolvedAttendanceConfig(admin, effectiveCompanyId)
    const effectiveSchedule = await resolveEffectiveWorkScheduleId({
      supabase: admin,
      companyId: effectiveCompanyId,
      employeeId,
      date: dateStr,
      fallbackWorkScheduleId: emp?.work_schedule_id ?? null,
    })

    let expectedStart: string | null = null
    let shiftType: string | null = null
    if (effectiveSchedule.found) {
      const { data: schedule } = await admin
        .from('work_schedules')
        .select(
          'id, monday_start, monday_end, tuesday_start, tuesday_end, wednesday_start, wednesday_end, thursday_start, thursday_end, friday_start, friday_end, saturday_start, saturday_end, sunday_start, sunday_end, shift_config, shift_type'
        )
        .eq('id', effectiveSchedule.workScheduleId)
        .maybeSingle()
      if (schedule) {
        expectedStart = getScheduleTimesForDate(schedule, dateStr).start
        shiftType = typeof schedule.shift_type === 'string' ? schedule.shift_type : null
      }
    }

    const approved = buildApprovedAttendancePatch({
      existing,
      proposed: {
        proposed_check_in: corr.proposed_check_in,
        proposed_check_out: corr.proposed_check_out,
        proposed_lunch_start: corr.proposed_lunch_start,
        proposed_lunch_end: corr.proposed_lunch_end,
      },
      expectedStart,
      shiftType,
      timeZone: timezone,
    })

    const marksErr = getAttendanceMarksValidationError(approved.marks)
    if (marksErr) return res.status(400).json({ error: marksErr })

    const patch = {
      date: dateStr,
      ...approved.marks,
      status: approved.status,
      late_minutes: approved.late_minutes,
      expected_check_in: approved.expected_check_in,
      flags: approved.flags,
    }

    let recordId = existing?.id as string | undefined
    let afterSnapshot: any = null

    if (recordId) {
      const { data: upd, error: updErr } = await admin
        .from('attendance_records')
        .update(patch)
        .eq('id', recordId)
        .select('id, employee_id, date, check_in, check_out, lunch_start, lunch_end, status, late_minutes, early_departure_minutes, flags, expected_check_in')
        .single()
      if (updErr) return res.status(500).json({ error: updErr.message })
      afterSnapshot = upd
      recordId = upd.id
    } else {
      const { data: ins, error: insErr } = await admin
        .from('attendance_records')
        .insert({
          employee_id: employeeId,
          ...patch,
        })
        .select('id, employee_id, date, check_in, check_out, lunch_start, lunch_end, status, late_minutes, early_departure_minutes, flags, expected_check_in')
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
      if (rpcErr) {
        return res.status(500).json({ error: humanizeAttendanceHoursCalcError(rpcErr.message) })
      }
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

