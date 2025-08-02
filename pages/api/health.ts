import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../lib/supabase/server'
import { logger } from '../../lib/logger'

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  environment: string
  checks: {
    database: {
      status: 'up' | 'down'
      latency?: number
      error?: string
    }
    environment_variables: {
      status: 'up' | 'down'
      missing?: string[]
    }
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<HealthStatus>) {
  const startTime = Date.now()
  
  if (req.method !== 'GET') {
    logger.warn('Invalid method on health check', { method: req.method })
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.1.0',
      environment: process.env.NODE_ENV || 'development',
      checks: {
        database: { status: 'down', error: 'Method not allowed' },
        environment_variables: { status: 'down' }
      }
    })
  }

  const healthStatus: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.1.0',
    environment: process.env.NODE_ENV || 'development',
    checks: {
      database: { status: 'up' },
      environment_variables: { status: 'up' }
    }
  }

  // Check environment variables
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ]

  const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName])
  
  if (missingEnvVars.length > 0) {
    healthStatus.status = 'degraded'
    healthStatus.checks.environment_variables = {
      status: 'down',
      missing: missingEnvVars
    }
  }

  // Check database connectivity
  try {
    const dbStartTime = Date.now()
    const supabase = createAdminClient()
    
    // Simple query to test connectivity
    const { error } = await supabase
      .from('companies')
      .select('id')
      .limit(1)
    
    const latency = Date.now() - dbStartTime
    
    if (error) {
      logger.error('Database health check failed', error, { latency })
      healthStatus.status = 'degraded'
      healthStatus.checks.database = {
        status: 'down',
        error: error.message,
        latency
      }
    } else {
      logger.debug('Database health check passed', { latency })
      healthStatus.checks.database = {
        status: 'up',
        latency
      }
    }
  } catch (error) {
    logger.error('Database health check error', error)
    healthStatus.status = 'unhealthy'
    healthStatus.checks.database = {
      status: 'down',
      error: error instanceof Error ? error.message : 'Unknown database error'
    }
  }

  // Set appropriate HTTP status code
  const statusCode = healthStatus.status === 'healthy' ? 200 : 
                    healthStatus.status === 'degraded' ? 200 : 503

  // Log health check result
  const duration = Date.now() - startTime
  logger.info('Health check completed', {
    status: healthStatus.status,
    statusCode,
    duration,
    checks: {
      database: healthStatus.checks.database.status,
      envVars: healthStatus.checks.environment_variables.status
    }
  })

  res.status(statusCode).json(healthStatus)
}