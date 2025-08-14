import type { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../lib/supabase/server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { grain = 'day', from, to } = req.query
  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc('attendance_aggregate', {
    grain: grain as string,
    from: from as string,
    to: to as string
  })
  if (error) {
    console.error('attendance_aggregate error', error)
    return res.status(500).json({ error: error.message })
  }
  res.status(200).json(data)
}
