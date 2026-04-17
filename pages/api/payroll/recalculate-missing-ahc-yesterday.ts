import { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../lib/auth/api-auth-fixed'

/**
 * Pragmatic ops endpoint: reconcile yesterday's missing AHC rows across companies (DB-driven).
 * This uses the SQL function created in migration:
 *   app_private.recalculate_missing_ahc_yesterday()
 *
 * Auth: requires admin role + authenticated session (no secrets hardcoded).
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { supabase, role } = await requireCompanyAccess(req, res)
    if (!['super_admin'].includes(role)) {
      return res.status(403).json({ error: 'Permisos insuficientes' })
    }

    const { data, error } = await supabase.rpc('recalculate_missing_ahc_yesterday')
    if (error) {
      return res.status(500).json({ error: error.message })
    }

    return res.status(200).json({ success: true, result: data })
  } catch (e) {
    if ((e as Error).message === 'UNAUTHORIZED' || (e as Error).message === 'PROFILE_REQUIRED') return
    console.error('payroll recalculate-missing-ahc-yesterday:', e)
    return res.status(500).json({
      error: 'Error ejecutando reconciliación',
      message: e instanceof Error ? e.message : 'Error desconocido',
    })
  }
}

