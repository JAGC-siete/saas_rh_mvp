import type { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../lib/supabase/server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { months = '6' } = req.query
    const supabase = createAdminClient()
    const m = Math.max(1, Math.min(24, parseInt(String(months), 10) || 6))
    const since = new Date(); since.setMonth(since.getMonth() - m)
    const sinceStr = since.toISOString().slice(0,7) // YYYY-MM

    const { data, error } = await supabase
      .from('payroll_records')
      .select('period_start, gross_salary, total_deductions, net_salary')
      .gte('period_start', `${sinceStr}-01`)

    if (error) return res.status(500).json({ error: error.message })

    const byMonth: Record<string, { gross: number; net: number; count: number }> = {}
    for (const r of (data || [])) {
      const ym = String(r.period_start).slice(0,7)
      byMonth[ym] = byMonth[ym] || { gross: 0, net: 0, count: 0 }
      byMonth[ym].gross += r.gross_salary || 0
      byMonth[ym].net += r.net_salary || 0
      byMonth[ym].count += 1
    }
    const series = Object.keys(byMonth).sort().map(k => ({ month: k, total_gross: byMonth[k].gross, total_net: byMonth[k].net, records: byMonth[k].count }))
    return res.status(200).json({ months: m, series })
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Internal error' })
  }
}


