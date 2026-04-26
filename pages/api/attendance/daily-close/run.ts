import { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../../lib/auth/api-auth-fixed'
import { createAdminClient } from '../../../../lib/supabase/server'
import {
  generateDailyCloseReport,
  resolveCompanyIdForDailyClose,
} from '../../../../lib/attendance/daily-close'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
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
      return res.status(400).json({
        error: 'company_id requerido',
        message: 'super_admin debe enviar company_id en body',
      })
    }

    const admin = createAdminClient()
    const result = await generateDailyCloseReport({
      companyId,
      localDate: date,
      supabase: admin,
    })

    return res.status(200).json({ success: true, result })
  } catch (e) {
    if ((e as Error).message === 'UNAUTHORIZED' || (e as Error).message === 'PROFILE_REQUIRED') {
      return
    }
    console.error('daily-close run:', e)
    return res.status(500).json({
      error: 'Error al ejecutar control de horas extras',
      message: e instanceof Error ? e.message : 'Error desconocido',
    })
  }
}
