import type { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../lib/supabase/server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { scope = 'today', type = 'absent' } = req.query
  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc('attendance_lists', {
    scope: scope as string,
    type: type as string
  })
  if (error) {
    console.error('attendance_lists error', error)
    return res.status(500).json({ error: error.message })
  }
  res.status(200).json(data)
}
