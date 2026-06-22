import type { NextApiRequest, NextApiResponse } from 'next'
import { dispatchScheduledCampaigns } from '../../../lib/communication-service'

/**
 * Dispatches scheduled communication campaigns whose time has arrived.
 * Triggered daily at 07:00 America/Tegucigalpa by Railway function
 * `communications-dispatch-cron` (cron: 0 13 * * * UTC) with CRON_SECRET.
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
    const result = await dispatchScheduledCampaigns(new Date())
    return res.status(200).json({ success: true, ...result, timestamp: new Date().toISOString() })
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
