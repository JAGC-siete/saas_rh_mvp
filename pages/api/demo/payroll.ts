import { NextApiRequest, NextApiResponse } from 'next'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!req.cookies['demo_ok']) {
    return res.status(401).json({ error: 'Demo access required' })
  }

  return res.status(200).json({
    data: {
      records_generated: 10,
      totals: {
        gross: 105750,
        net: 98212.15,
      },
    },
  })
}
