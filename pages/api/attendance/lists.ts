import type { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../lib/supabase/server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { scope = 'today', type = 'absent', team } = req.query
  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc('attendance_lists', {
    scope: scope as string,
    type: type as string,
    team: (team as string) || null,
  })
  if (error) {
    console.error('attendance_lists error', error)
    return res.status(500).json({ error: error.message })
  }
  // Map RPC field team_out -> team to match UI expectation
  const mapped = Array.isArray(data)
    ? data.map((row: any) => ({ ...row, team: row.team ?? row.team_out ?? null }))
    : []
  res.status(200).json(mapped)
}
