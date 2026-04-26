import type { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../lib/auth/api-auth-fixed'
import { createAdminClient } from '../../../lib/supabase/server'

function isIsoDateOnly(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s)
}

function parseWeekdays(v: unknown): number[] | null {
  if (!Array.isArray(v)) return null
  const out = v.filter((x) => Number.isInteger(x) && x >= 0 && x <= 6) as number[]
  return out.length > 0 ? Array.from(new Set(out)) : null
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') return handleList(req, res)
  if (req.method === 'POST') return handleCreate(req, res)
  res.setHeader('Allow', ['GET', 'POST'])
  return res.status(405).json({ error: 'Method not allowed' })
}

async function handleList(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { role, companyId: profileCid } = await requireCompanyAccess(req, res)
    if (!['super_admin', 'company_admin', 'hr_manager'].includes(role)) {
      return res.status(403).json({ error: 'Permisos insuficientes' })
    }

    const companyId =
      role === 'super_admin' ? (typeof req.query.company_id === 'string' ? req.query.company_id : null) : profileCid
    if (!companyId) return res.status(400).json({ error: 'company_id requerido' })

    const employeeId = typeof req.query.employee_id === 'string' ? req.query.employee_id : undefined
    const from = typeof req.query.from === 'string' ? req.query.from : undefined
    const to = typeof req.query.to === 'string' ? req.query.to : undefined

    const admin = createAdminClient()
    let q = admin
      .from('employee_schedule_assignments')
      .select(
        `
        id,
        company_id,
        employee_id,
        work_schedule_id,
        valid_from,
        valid_to,
        repeat_weekly,
        repeat_weekdays,
        created_at,
        employees:employee_id(id, name, employee_code, department_id),
        schedules:work_schedule_id(id, name)
      `
      )
      .eq('company_id', companyId)
      .order('valid_from', { ascending: false })

    if (employeeId) q = q.eq('employee_id', employeeId)
    if (from && isIsoDateOnly(from)) q = q.gte('valid_to', from)
    if (to && isIsoDateOnly(to)) q = q.lte('valid_from', to)

    const { data, error } = await q
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ success: true, data: data ?? [] })
  } catch (e) {
    if ((e as Error).message === 'UNAUTHORIZED' || (e as Error).message === 'PROFILE_REQUIRED') return
    return res.status(500).json({ error: 'Error listando asignaciones', message: e instanceof Error ? e.message : 'Error desconocido' })
  }
}

async function handleCreate(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { role, companyId: profileCid, user } = await requireCompanyAccess(req, res)
    if (!['super_admin', 'company_admin', 'hr_manager'].includes(role)) {
      return res.status(403).json({ error: 'Permisos insuficientes' })
    }

    const body = req.body || {}
    const companyId =
      role === 'super_admin' ? (typeof body.company_id === 'string' ? body.company_id : null) : profileCid
    if (!companyId) return res.status(400).json({ error: 'company_id requerido' })

    const employeeIds = Array.isArray(body.employee_ids) ? body.employee_ids.filter((x: unknown) => typeof x === 'string') : []
    const workScheduleId = typeof body.work_schedule_id === 'string' ? body.work_schedule_id : ''
    const validFrom = typeof body.valid_from === 'string' ? body.valid_from : ''
    const validTo = typeof body.valid_to === 'string' ? body.valid_to : ''
    const repeatWeekly = body.repeat_weekly === true
    const repeatWeekdays = parseWeekdays(body.repeat_weekdays)

    if (employeeIds.length === 0) return res.status(400).json({ error: 'employee_ids requerido' })
    if (!workScheduleId) return res.status(400).json({ error: 'work_schedule_id requerido' })
    if (!isIsoDateOnly(validFrom) || !isIsoDateOnly(validTo)) return res.status(400).json({ error: 'valid_from/valid_to inválidos' })
    if (validFrom > validTo) return res.status(400).json({ error: 'valid_from debe ser <= valid_to' })

    const admin = createAdminClient()

    // validate employees belong to company
    const { data: emps, error: empErr } = await admin
      .from('employees')
      .select('id, company_id')
      .in('id', employeeIds)
    if (empErr) return res.status(500).json({ error: empErr.message })
    const okIds = (emps || []).filter((e: any) => e.company_id === companyId).map((e: any) => e.id)
    if (okIds.length === 0) return res.status(400).json({ error: 'Empleados inválidos para la empresa' })

    const rows = okIds.map((employee_id: string) => ({
      company_id: companyId,
      employee_id,
      work_schedule_id: workScheduleId,
      valid_from: validFrom,
      valid_to: validTo,
      repeat_weekly: repeatWeekly,
      repeat_weekdays: repeatWeekdays,
      created_by: user?.id ?? null,
    }))

    const { data, error } = await admin.from('employee_schedule_assignments').insert(rows).select('*')
    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json({ success: true, inserted: data?.length ?? 0, data: data ?? [] })
  } catch (e) {
    if ((e as Error).message === 'UNAUTHORIZED' || (e as Error).message === 'PROFILE_REQUIRED') return
    return res.status(500).json({ error: 'Error creando asignaciones', message: e instanceof Error ? e.message : 'Error desconocido' })
  }
}

