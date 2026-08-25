import type { NextApiRequest, NextApiResponse } from 'next'
import { processPendingOdooOutbox } from '../../../lib/integrations/odoo/process-outbox'

/**
 * Drains pending Odoo outbox rows. Covers deployments without Redis.
 * Auth: Bearer CRON_SECRET. POST, same pattern as communications-dispatch.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authHeader = req.headers.authorization
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    res.setHeader('Allow', ['GET', 'POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const result = await processPendingOdooOutbox(50)
    return res.status(200).json({ success: true, ...result, timestamp: new Date().toISOString() })
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
