import type { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../../lib/supabase/server'
import { getDateRange } from '../../../../lib/attendance'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query
  const { preset = 'week', from, to } = req.query
  const range = typeof from === 'string' && typeof to === 'string'
    ? { from, to }
    : getDateRange(preset as string)

  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc('attendance_employee_timeline', {
    p_employee_id: id as string,
    p_from: range.from,
    p_to: range.to
  })
  if (error) {
    console.error('attendance_employee_timeline error', error)
    return res.status(500).json({ error: error.message })
  }
  res.status(200).json(data)
}
