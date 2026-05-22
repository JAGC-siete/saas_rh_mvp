import type { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../../lib/auth/api-auth-fixed'
import { createAdminClient } from '../../../../lib/supabase/server'
import {
  isIsoDateOnly,
  normalizeRepeatWeekdays,
  parseWeekdays,
  planAssignmentConflictResolutions,
  type AssignmentRow,
} from '../../../../lib/attendance/schedule-assignment-logic'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = typeof req.query.id === 'string' ? req.query.id : ''
  if (!id) return res.status(400).json({ error: 'id requerido' })

  if (req.method === 'PATCH') return handlePatch(req, res, id)
  if (req.method === 'DELETE') return handleDelete(req, res, id)
  res.setHeader('Allow', ['PATCH', 'DELETE'])
  return res.status(405).json({ error: 'Method not allowed' })
}

async function loadAssignment(admin: ReturnType<typeof createAdminClient>, id: string) {
  const { data, error } = await admin
    .from('employee_schedule_assignments')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

async function handlePatch(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    const { role, companyId: profileCid } = await requireCompanyAccess(req, res)
    if (!['super_admin', 'company_admin', 'hr_manager'].includes(role)) {
      return res.status(403).json({ error: 'Permisos insuficientes' })
    }

    const admin = createAdminClient()
    const existing = await loadAssignment(admin, id)
    if (!existing) return res.status(404).json({ error: 'Asignación no encontrada' })

    const companyId = role === 'super_admin' ? existing.company_id : profileCid
    if (existing.company_id !== companyId) return res.status(403).json({ error: 'Forbidden' })

    const body = req.body || {}
    const validFrom = typeof body.valid_from === 'string' ? body.valid_from : existing.valid_from
    const validTo = typeof body.valid_to === 'string' ? body.valid_to : existing.valid_to
    const workScheduleId =
      typeof body.work_schedule_id === 'string' ? body.work_schedule_id : existing.work_schedule_id
    const repeatWeekly = body.repeat_weekly === undefined ? existing.repeat_weekly === true : body.repeat_weekly === true
    const repeatWeekdays =
      body.repeat_weekdays !== undefined
        ? normalizeRepeatWeekdays(repeatWeekly, parseWeekdays(body.repeat_weekdays))
        : existing.repeat_weekdays

    if (!isIsoDateOnly(validFrom) || !isIsoDateOnly(validTo)) {
      return res.status(400).json({ error: 'valid_from/valid_to inválidos' })
    }
    if (validFrom > validTo) return res.status(400).json({ error: 'valid_from debe ser <= valid_to' })

    const { data: others } = await admin
      .from('employee_schedule_assignments')
      .select('id, employee_id, valid_from, valid_to, work_schedule_id')
      .eq('company_id', companyId)
      .eq('employee_id', existing.employee_id)
      .neq('id', id)
      .lte('valid_from', validTo)
      .gte('valid_to', validFrom)

    const actions = planAssignmentConflictResolutions((others || []) as AssignmentRow[], validFrom, validTo)
    for (const action of actions) {
      if (action.action === 'delete') {
        await admin.from('employee_schedule_assignments').delete().eq('id', action.id)
      } else {
        const patch: Record<string, string> = {}
        if (action.valid_from) patch.valid_from = action.valid_from
        if (action.valid_to) patch.valid_to = action.valid_to
        if (Object.keys(patch).length > 0) {
          await admin.from('employee_schedule_assignments').update(patch).eq('id', action.id)
        }
      }
    }

    const { data, error } = await admin
      .from('employee_schedule_assignments')
      .update({
        valid_from: validFrom,
        valid_to: validTo,
        work_schedule_id: workScheduleId,
        repeat_weekly: repeatWeekly,
        repeat_weekdays: repeatWeekdays,
      })
      .eq('id', id)
      .select('*')
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ success: true, data, trimmed: actions.length })
  } catch (e) {
    if ((e as Error).message === 'UNAUTHORIZED' || (e as Error).message === 'PROFILE_REQUIRED') return
    return res.status(500).json({ error: 'Error actualizando asignación', message: e instanceof Error ? e.message : 'Error desconocido' })
  }
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    const { role, companyId: profileCid } = await requireCompanyAccess(req, res)
    if (!['super_admin', 'company_admin', 'hr_manager'].includes(role)) {
      return res.status(403).json({ error: 'Permisos insuficientes' })
    }

    const admin = createAdminClient()
    const existing = await loadAssignment(admin, id)
    if (!existing) return res.status(404).json({ error: 'Asignación no encontrada' })

    const companyId = role === 'super_admin' ? existing.company_id : profileCid
    if (existing.company_id !== companyId) return res.status(403).json({ error: 'Forbidden' })

    const { error } = await admin.from('employee_schedule_assignments').delete().eq('id', id)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ success: true, deleted: id })
  } catch (e) {
    if ((e as Error).message === 'UNAUTHORIZED' || (e as Error).message === 'PROFILE_REQUIRED') return
    return res.status(500).json({ error: 'Error eliminando asignación', message: e instanceof Error ? e.message : 'Error desconocido' })
  }
}
