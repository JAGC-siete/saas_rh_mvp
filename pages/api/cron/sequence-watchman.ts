import { NextApiRequest, NextApiResponse } from 'next'
import { runSequenceWatchman } from '../../../lib/cron/sequence-watchman'
import { logger } from '../../../lib/logger'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authHeader = req.headers.authorization
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const result = await runSequenceWatchman()

    return res.status(200).json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Sequence Watchman cron failed', { error: message })
    return res.status(500).json({ success: false, error: message })
  }
}
