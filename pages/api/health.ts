import type { NextApiRequest, NextApiResponse } from 'next'
import { getHondurasTimestamp } from '../../lib/timezone'
import { withRateLimit } from '../../lib/security/rate-limiting'

async function healthHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    // Basic health check - can be extended with database connectivity, etc.
    // En producción, no exponer información sensible
    const healthStatus: any = {
      status: 'healthy',
      timestamp: getHondurasTimestamp(),
      uptime: process.uptime()
    }

    // Solo incluir environment y version en desarrollo
    if (process.env.NODE_ENV !== 'production') {
      healthStatus.environment = process.env.NODE_ENV
      healthStatus.version = process.env.npm_package_version || 'unknown'
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

// Apply rate limiting: max 10 requests per minute for health checks
export default withRateLimit('general')(healthHandler)
