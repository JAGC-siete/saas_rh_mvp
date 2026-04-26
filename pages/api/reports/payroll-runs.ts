import type { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../lib/auth/api-auth-fixed'

/**
 * GET /api/reports/payroll-runs
 * Returns recent payroll runs for the company to allow selecting an executed run.
 *
 * Query params:
 * - year?: number
 * - month?: number
 * - limit?: number (default 30, max 100)
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { supabase, companyId } = await requireCompanyAccess(req, res)
    if (!companyId) return res.status(400).json({ error: 'Company ID is required' })

    const year = req.query.year ? Number(req.query.year) : undefined
    const month = req.query.month ? Number(req.query.month) : undefined
    const limitRaw = req.query.limit ? Number(req.query.limit) : 30
    const limit = Number.isFinite(limitRaw) ? Math.min(100, Math.max(1, limitRaw)) : 30

    let q = supabase
      .from('payroll_runs')
      .select('id, year, month, quincena, tipo, status, authorized_at, created_at')
      .eq('company_id', companyId)
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .order('quincena', { ascending: false })
      .limit(limit)

    if (year && Number.isFinite(year)) q = q.eq('year', year)
    if (month && Number.isFinite(month)) q = q.eq('month', month)

    const { data, error } = await q
    if (error) return res.status(500).json({ error: 'Error fetching payroll runs', details: error.message })

    const runs = (data || []).map((r: any) => ({
      id: r.id,
      year: r.year,
      month: r.month,
      quincena: r.quincena,
      tipo: r.tipo,
      status: r.status,
      label: `${r.year}-${String(r.month).padStart(2, '0')} Q${r.quincena} (${r.tipo}) · ${r.status}`
    }))

    return res.status(200).json({ success: true, runs })
  } catch (e: any) {
    return res.status(e?.message === 'UNAUTHORIZED' ? 401 : 500).json({ error: e?.message || 'Internal server error' })
  }
}

