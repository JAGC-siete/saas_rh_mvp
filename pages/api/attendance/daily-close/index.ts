import { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../../lib/auth/api-auth-fixed'
import { createAdminClient } from '../../../../lib/supabase/server'
import {
  buildDailyCloseReportPayload,
  resolveCompanyIdForDailyClose,
} from '../../../../lib/attendance/daily-close'

function parseBool(v: unknown): boolean | undefined {
  if (typeof v !== 'string') return undefined
  if (v === 'true' || v === '1') return true
  if (v === 'false' || v === '0') return false
  return undefined
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { role, companyId: profileCid, user } = await requireCompanyAccess(req, res)
    if (!['super_admin', 'company_admin', 'hr_manager'].includes(role)) {
      return res.status(403).json({ error: 'Permisos insuficientes' })
    }

    const date = typeof req.query.date === 'string' ? req.query.date : ''
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Query date requerido (YYYY-MM-DD)' })
    }

    const explicit =
      typeof req.query.company_id === 'string' ? req.query.company_id : undefined
    const companyId = resolveCompanyIdForDailyClose(role, profileCid, explicit)
    if (!companyId) {
      return res.status(400).json({
        error: 'company_id requerido',
        message: 'super_admin debe enviar company_id en query',
      })
    }

    const admin = createAdminClient()
    const payload = await buildDailyCloseReportPayload({
      companyId,
      localDate: date,
      supabase: admin,
      filters: {
        only_with_events: parseBool(req.query.only_with_events) ?? true,
        department_id: typeof req.query.department_id === 'string' ? req.query.department_id : undefined,
        role: typeof req.query.role === 'string' ? req.query.role : undefined,
        team: typeof req.query.team === 'string' ? req.query.team : undefined,
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        sort: typeof req.query.sort === 'string' ? req.query.sort : undefined,
      },
    })

    return res.status(200).json({
      ...payload,
      generated_at: new Date().toISOString(),
      requested_by: user?.id ?? null,
    })
  } catch (e) {
    if ((e as Error).message === 'UNAUTHORIZED' || (e as Error).message === 'PROFILE_REQUIRED') {
      return
    }
    console.error('daily-close GET:', e)
    return res.status(500).json({
      error: 'Error al armar cierre de día',
      message: e instanceof Error ? e.message : 'Error desconocido',
    })
  }
}
