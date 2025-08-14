import type { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../lib/supabase/server'
import { getDateRange } from '../../../lib/attendance'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { preset = 'today', from, to, role } = req.query
  const range = typeof from === 'string' && typeof to === 'string'
    ? { from, to }
    : getDateRange(preset as string)

  const supabase = createAdminClient()
  const rpcArgsRole: any = {
    from: range.from,
    to: range.to,
  }
  rpcArgsRole.role = (typeof role === 'string' && role.trim() !== '') ? role : null

  // Try with 'role' param first; fallback to legacy 'team'
  let { data, error } = await supabase.rpc('attendance_kpis', rpcArgsRole)
  if (error) {
    const rpcArgsTeam = { ...rpcArgsRole, team: rpcArgsRole.role, role: undefined }
    const retry = await supabase.rpc('attendance_kpis', rpcArgsTeam as any)
    data = retry.data
    error = retry.error as any
  }

  if (error) {
    console.error('attendance_kpis error', error)
    return res.status(500).json({ error: error.message })
  }

  // RPC puede devolver row único en array
  const row = Array.isArray(data) ? (data[0] || null) : data
  res.status(200).json(row)
}
