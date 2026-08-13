import type { NextApiRequest, NextApiResponse } from 'next'
import { runSupportSlaEscalation } from '../../../lib/cron/support-sla'

/**
 * SLA escalation cron for support tickets. Schedule this endpoint (e.g. every
 * 15 minutes) with an external scheduler using the CRON_SECRET bearer token.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authHeader = req.headers.authorization
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const result = await runSupportSlaEscalation(new Date())
    return res.status(200).json({ success: true, ...result, timestamp: new Date().toISOString() })
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
