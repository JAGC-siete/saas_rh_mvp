import { NextApiRequest, NextApiResponse } from 'next'
import { executeScheduledJob } from '../../../lib/jobs'
import { logger } from '../../../lib/logger'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verificar que es una llamada de Vercel Cron
  const authHeader = req.headers.authorization
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    logger.info('Unauthorized cron job attempt', { 
      ip: req.headers['x-forwarded-for'],
      userAgent: req.headers['user-agent']
    })
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    logger.info('Starting scheduled backup of critical data')
    
    const result = await executeScheduledJob('backup-critical-data')
    
    if (result.success) {
      logger.info('Scheduled backup completed successfully', { 
        duration: result.duration,
        message: result.message 
      })
      return res.status(200).json({
        success: true,
        message: result.message,
        duration: result.duration
      })
    } else {
      logger.error('Scheduled backup failed', { 
        error: result.error,
        duration: result.duration 
      })
      return res.status(500).json({
        success: false,
        message: result.message,
        error: result.error
      })
    }

  } catch (error) {
    logger.error('Unexpected error in backup cron job', { error })
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
} 