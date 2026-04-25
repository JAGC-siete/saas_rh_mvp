import type { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../../lib/auth/api-auth-fixed'
import { createAdminClient } from '../../../../lib/supabase/server'

type Status = 'pending' | 'approved' | 'rejected'

function isIsoDateOnly(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s)
}

function parseStatus(v: unknown): Status | undefined {
  if (v === 'pending' || v === 'approved' || v === 'rejected') return v
  return undefined
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') return handleList(req, res)
  if (req.method === 'POST') return handleCreate(req, res)
  res.setHeader('Allow', ['GET', 'POST'])
  return res.status(405).json({ error: 'Method not allowed' })
}

async function handleList(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { role, companyId, userProfile } = await requireCompanyAccess(req, res)
    const admin = createAdminClient()

    const qStatus = parseStatus(req.query.status)
    const qDate = typeof req.query.date === 'string' ? req.query.date : undefined
    const qEmployeeId = typeof req.query.employee_id === 'string' ? req.query.employee_id : undefined

    const isEmployee = role === 'employee'
    const employeeIdFromProfile = typeof userProfile?.employee_id === 'string' ? userProfile.employee_id : null

    if (isEmployee && !employeeIdFromProfile) {
      return res.status(403).json({ error: 'Perfil de empleado no vinculado' })
    }

    // super_admin: must specify company_id
    const effectiveCompanyId =
      role === 'super_admin'
        ? typeof req.query.company_id === 'string'
          ? req.query.company_id
          : null
        : companyId

    if (!effectiveCompanyId) {
      return res.status(400).json({ error: 'company_id requerido' })
    }

    let query = admin
      .from('attendance_corrections')
      .select(
        `
        id,
        company_id,
        employee_id,
        date,
        proposed_check_in,
        proposed_check_out,
        proposed_lunch_start,
        proposed_lunch_end,
        reason,
        status,
        reviewed_by,
        reviewed_at,
        reviewer_note,
        created_by,
        created_at,
        updated_at,
        attendance_record_id,
        employees:employee_id(id, name, employee_code, department_id, role)
      `
      )
      .eq('company_id', effectiveCompanyId)
      .order('created_at', { ascending: false })

    if (qStatus) query = query.eq('status', qStatus)
    if (qDate) {
      if (!isIsoDateOnly(qDate)) return res.status(400).json({ error: 'date inválido (YYYY-MM-DD)' })
      query = query.eq('date', qDate)
    }

    if (isEmployee) {
      query = query.eq('employee_id', employeeIdFromProfile!)
    } else if (qEmployeeId) {
      query = query.eq('employee_id', qEmployeeId)
    }

    const { data, error } = await query
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ success: true, data: data ?? [] })
  } catch (e) {
    if ((e as Error).message === 'UNAUTHORIZED' || (e as Error).message === 'PROFILE_REQUIRED') return
    return res.status(500).json({ error: 'Error listando correcciones', message: e instanceof Error ? e.message : 'Error desconocido' })
  }
}

async function handleCreate(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { role, companyId, user, userProfile } = await requireCompanyAccess(req, res)
    const admin = createAdminClient()

    const body = req.body || {}
    const date = typeof body.date === 'string' ? body.date : ''
    if (!isIsoDateOnly(date)) return res.status(400).json({ error: 'date requerido (YYYY-MM-DD)' })

    const isEmployee = role === 'employee'
    const employeeIdFromProfile = typeof userProfile?.employee_id === 'string' ? userProfile.employee_id : null
    const employeeIdInput = typeof body.employee_id === 'string' ? body.employee_id : null

    const effectiveCompanyId =
      role === 'super_admin'
        ? typeof body.company_id === 'string'
          ? body.company_id
          : null
        : companyId

    if (!effectiveCompanyId) return res.status(400).json({ error: 'company_id requerido' })

    const employeeId = isEmployee ? employeeIdFromProfile : employeeIdInput
    if (!employeeId) return res.status(400).json({ error: 'employee_id requerido' })

    const proposed_check_in = typeof body.proposed_check_in === 'string' ? body.proposed_check_in : null
    const proposed_check_out = typeof body.proposed_check_out === 'string' ? body.proposed_check_out : null
    const proposed_lunch_start = typeof body.proposed_lunch_start === 'string' ? body.proposed_lunch_start : null
    const proposed_lunch_end = typeof body.proposed_lunch_end === 'string' ? body.proposed_lunch_end : null

    const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
    if (!reason) return res.status(400).json({ error: 'reason requerido' })

    // Capture current record snapshot for audit (best effort)
    const { data: existing } = await admin
      .from('attendance_records')
      .select('id, employee_id, date, check_in, check_out, lunch_start, lunch_end, status, late_minutes, early_departure_minutes, flags')
      .eq('employee_id', employeeId)
      .eq('date', date)
      .maybeSingle()

    const insertPayload: any = {
      company_id: effectiveCompanyId,
      employee_id: employeeId,
      date,
      proposed_check_in,
      proposed_check_out,
      proposed_lunch_start,
      proposed_lunch_end,
      reason,
      status: 'pending',
      created_by: user?.id ?? null,
      before_snapshot: existing ?? null,
      attendance_record_id: existing?.id ?? null,
    }

    const { data, error } = await admin.from('attendance_corrections').insert(insertPayload).select('*').single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json({ success: true, data })
  } catch (e) {
    if ((e as Error).message === 'UNAUTHORIZED' || (e as Error).message === 'PROFILE_REQUIRED') return
    return res.status(500).json({ error: 'Error creando corrección', message: e instanceof Error ? e.message : 'Error desconocido' })
  }
}

