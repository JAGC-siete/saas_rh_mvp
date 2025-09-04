import type { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../lib/supabase/server'
import { getDateRange } from '../../../lib/attendance'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { format = 'csv', preset = 'today', employee_id, from, to } = req.query
  const supabase = createAdminClient()

  const range = typeof from === 'string' && typeof to === 'string'
    ? { from, to }
    : getDateRange(String(preset))

  const { data, error } = await supabase.rpc('attendance_export', {
    p_employee_id: (typeof employee_id === 'string' && employee_id.trim() !== '') ? employee_id.trim() : null,
    p_from: range.from as string,
    p_to: range.to as string
  })
  if (error) {
    console.error('attendance_export error', error)
    return res.status(500).json({ error: error.message })
  }
  if (format === 'csv') {
    const headers = Object.keys(data[0] || {})
    const csv = [headers.join(','), ...(data as any[]).map(row => headers.map(h => row[h]).join(','))].join('\n')
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename="attendance.csv"')
    return res.status(200).send(csv)
  }
  res.status(200).json(data)
}
