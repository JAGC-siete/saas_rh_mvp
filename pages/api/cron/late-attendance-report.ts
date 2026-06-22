import type { NextApiRequest, NextApiResponse } from 'next'
import { runLateAttendanceReportCron } from '../../../lib/cron/late-attendance-report'
import { logger } from '../../../lib/logger'

/**
 * POST /api/cron/late-attendance-report
 * Runs at end of each company's pay period (daily check: yesterday = period end).
 * Schedule on Railway: 0 13 * * * (07:00 America/Tegucigalpa)
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
    const result = await runLateAttendanceReportCron(new Date())
    logger.info('Late attendance report cron completed', result)
    return res.status(200).json({ success: true, ...result, timestamp: new Date().toISOString() })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Late attendance report cron failed', { error: message })
    return res.status(500).json({ success: false, error: message })
  }
}
