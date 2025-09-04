import type { NextApiRequest, NextApiResponse } from 'next'
import { getHondurasTimestamp } from '../../lib/timezone'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    // Basic health check - can be extended with database connectivity, etc.
    const healthStatus = {
      status: 'healthy',
      timestamp: getHondurasTimestamp(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || 'unknown'
    }

    res.status(200).json(healthStatus)
  } catch (error) {
    console.error('Health check failed:', error)
    res.status(503).json({ 
      status: 'unhealthy',
      timestamp: getHondurasTimestamp(),
      error: 'Service unavailable'
    })
  }
}
