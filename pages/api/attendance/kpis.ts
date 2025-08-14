import type { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../lib/supabase/server'
import { getDateRange } from '../../../lib/attendance'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { preset = 'today', from, to, team } = req.query
  const range = typeof from === 'string' && typeof to === 'string'
    ? { from, to }
    : getDateRange(preset as string)

  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc('attendance_kpis', {
    from: range.from,
    to: range.to,
    team: team as string | null
  })

  if (error) {
    console.error('attendance_kpis error', error)
    return res.status(500).json({ error: error.message })
  }

  res.status(200).json(data)
}
