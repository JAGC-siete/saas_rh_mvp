import type { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../lib/supabase/server'
import { getDateRange } from '../../../lib/attendance'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { preset = 'today', from, to, team } = req.query
  const range = typeof from === 'string' && typeof to === 'string'
    ? { from, to }
    : getDateRange(preset as string)

  const supabase = createAdminClient()
  const rpcArgs: any = {
    from: range.from,
    to: range.to,
  }
  if (typeof team === 'string' && team.trim() !== '') {
    rpcArgs.team = team
  } else {
    rpcArgs.team = null
  }
  const { data, error } = await supabase.rpc('attendance_kpis', rpcArgs)

  if (error) {
    console.error('attendance_kpis error', error)
    return res.status(500).json({ error: error.message })
  }

  // RPC puede devolver row único en array
  const row = Array.isArray(data) ? (data[0] || null) : data
  res.status(200).json(row)
}
