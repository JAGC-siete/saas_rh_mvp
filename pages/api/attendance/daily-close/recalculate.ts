import { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../../lib/auth/api-auth-fixed'
import { createAdminClient } from '../../../../lib/supabase/server'
import { resolveCompanyIdForDailyClose } from '../../../../lib/attendance/daily-close'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const startedAt = new Date().toISOString()
    const { role, companyId: profileCid } = await requireCompanyAccess(req, res)
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

    const recordIdsInput = Array.isArray(body.record_ids)
      ? body.record_ids.filter((x: unknown) => typeof x === 'string')
      : []

    const admin = createAdminClient()

    // Modo A (legacy/UI daily-close): record_ids explícitos.
    // Modo B (dashboard quick action): recalcular todos los registros elegibles del día para la empresa.
    const recordIds =
      recordIdsInput.length > 0
        ? recordIdsInput
        : await (async () => {
            const { data: empIds, error: empIdsErr } = await admin
              .from('employees')
              .select('id')
              .eq('company_id', companyId)
              .eq('status', 'active')
            if (empIdsErr) throw new Error(empIdsErr.message)
            const ids = (empIds || []).map((r: any) => r.id).filter(Boolean)
            if (ids.length === 0) return []

            const { data: recIds, error: recIdsErr } = await admin
              .from('attendance_records')
              .select('id')
              .eq('date', date)
              .in('employee_id', ids)
            if (recIdsErr) throw new Error(recIdsErr.message)
            return (recIds || []).map((r: any) => r.id).filter(Boolean)
          })()

    if (recordIds.length === 0) {
      return res.status(200).json({
        success: true,
        startedAt,
        finishedAt: new Date().toISOString(),
        calculated: 0,
        eligible: 0,
        message: 'Sin registros para recalcular',
      })
    }

    const { data: recs, error: recErr } = await admin
      .from('attendance_records')
      .select('id, employee_id, check_in, check_out, date')
      .in('id', recordIds)
      .eq('date', date)

    if (recErr) return res.status(500).json({ error: recErr.message })
    if (!recs || recs.length === 0) return res.status(404).json({ error: 'No hay registros para recalcular' })

    const empIds = Array.from(new Set(recs.map((r: any) => r.employee_id).filter(Boolean)))
    const { data: emps, error: empErr } = await admin
      .from('employees')
      .select('id, company_id')
      .in('id', empIds)
    if (empErr) return res.status(500).json({ error: empErr.message })

    const empCompany = new Map<string, string>()
    for (const e of emps || []) empCompany.set((e as any).id, (e as any).company_id)
    for (const r of recs as any[]) {
      if (!r.employee_id || empCompany.get(r.employee_id) !== companyId) {
        return res.status(403).json({ error: 'Uno o más registros están fuera de la empresa' })
      }
    }

    const eligible = (recs as any[])
      .filter((r) => r.check_in != null && r.check_out != null)
      .map((r) => r.id)

    if (eligible.length === 0) {
      return res.status(200).json({
        success: true,
        startedAt,
        finishedAt: new Date().toISOString(),
        calculated: 0,
        eligible: 0,
        totalConsidered: (recs as any[]).length,
        message: 'Sin registros completos (check_in/check_out)',
      })
    }

    const { data: results, error: rpcErr } = await admin.rpc('calculate_attendance_hours_batch', {
      p_record_ids: eligible,
      p_law_year: new Date(date).getFullYear(),
    })

    if (rpcErr) return res.status(500).json({ error: rpcErr.message })

    return res.status(200).json({
      success: true,
      startedAt,
      finishedAt: new Date().toISOString(),
      calculated: (results || []).length,
      eligible: eligible.length,
      totalConsidered: (recs as any[]).length,
      lastUpdated: new Date().toISOString(),
    })
  } catch (e) {
    if ((e as Error).message === 'UNAUTHORIZED' || (e as Error).message === 'PROFILE_REQUIRED') {
      return
    }
    console.error('daily-close recalculate:', e)
    return res.status(500).json({
      error: 'Error al recalcular horas',
      message: e instanceof Error ? e.message : 'Error desconocido',
    })
  }
}

