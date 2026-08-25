import { NextApiRequest, NextApiResponse } from 'next'
import { nowInHonduras } from '../../../lib/timezone'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!req.cookies['demo_ok']) {
    return res.status(401).json({ error: 'Demo access required' })
  }

  const today = nowInHonduras().toISOString().slice(0, 10)
  const from = typeof req.query.from === 'string' ? req.query.from : today
  const to = typeof req.query.to === 'string' ? req.query.to : today

  const data =
    today >= from && today <= to
      ? [
          {
            id: 'demo-att-1',
            employee_id: 'demo-emp-1',
            date: today,
            check_in: `${today}T08:05:00`,
            check_out: `${today}T17:02:00`,
            late_minutes: 5,
            status: 'present',
          },
          {
            id: 'demo-att-2',
            employee_id: 'demo-emp-2',
            date: today,
            check_in: `${today}T07:58:00`,
            check_out: `${today}T17:00:00`,
            late_minutes: 0,
            status: 'present',
          },
        ]
      : []

  return res.status(200).json({ data })
}
