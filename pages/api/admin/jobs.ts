import { NextApiRequest, NextApiResponse } from 'next'
import { executeScheduledJob, executeAllScheduledJobs, jobManager } from '../../../lib/jobs'
import { logger } from '../../../lib/logger'
import { createAdminClient } from '../../../lib/supabase/server'

interface JobsResponse {
  success: boolean
  message: string
  data?: any
  error?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<JobsResponse>
) {
  // Verificar autenticación y autorización
  try {
    const supabase = createAdminClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      logger.error('jobs_api_unauthorized', { error: authError?.message })
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
        error: 'Authentication required'
      })
    }

    // Verificar si el usuario es admin
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'admin') {
      logger.error('jobs_api_forbidden', { userId: user.id, role: profile?.role })
      return res.status(403).json({
        success: false,
        message: 'Forbidden',
        error: 'Admin privileges required'
      })
    }

    logger.info('jobs_api_access', { userId: user.id, method: req.method })

  } catch (error) {
    logger.error('Jobs API authentication error', { error })
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: 'Authentication failed'
    })
  }

  // Manejar diferentes métodos HTTP
  switch (req.method) {
    case 'GET':
      return handleGetJobs(req, res)
    case 'POST':
      return handleExecuteJob(req, res)
    default:
      res.setHeader('Allow', ['GET', 'POST'])
      return res.status(405).json({
        success: false,
        message: 'Method not allowed',
        error: `Method ${req.method} not allowed`
      })
  }
}

async function handleGetJobs(
  req: NextApiRequest,
  res: NextApiResponse<JobsResponse>
) {
  try {
    // Obtener lista de jobs disponibles
    const jobs = Array.from(jobManager['jobs'].keys()).map(jobName => ({
      name: jobName,
      status: 'available'
    }))

    logger.info('Jobs list requested', { jobsCount: jobs.length })

    return res.status(200).json({
      success: true,
      message: 'Jobs retrieved successfully',
      data: {
        jobs,
        total: jobs.length
      }
    })

  } catch (error) {
    logger.error('Error getting jobs list', { error })
    return res.status(500).json({
      success: false,
      message: 'Failed to get jobs list',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

async function handleExecuteJob(
  req: NextApiRequest,
  res: NextApiResponse<JobsResponse>
) {
  try {
    const { jobName, executeAll } = req.body

    if (executeAll) {
      logger.info('Executing all scheduled jobs')
      const results = await executeAllScheduledJobs()
      
      const successCount = results.filter(r => r.success).length
      const totalCount = results.length

      return res.status(200).json({
        success: true,
        message: `Executed ${totalCount} jobs (${successCount} successful)`,
        data: {
          results,
          summary: {
            total: totalCount,
            successful: successCount,
            failed: totalCount - successCount
          }
        }
      })
    }

    if (!jobName) {
      return res.status(400).json({
        success: false,
        message: 'Job name is required',
        error: 'Missing jobName parameter'
      })
    }

    logger.info('Executing specific job', { jobName })
    const result = await executeScheduledJob(jobName)

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: result.message,
        data: result
      })
    } else {
      return res.status(500).json({
        success: false,
        message: result.message,
        error: result.error,
        data: result
      })
    }

  } catch (error) {
    logger.error('Error executing job', { error, body: req.body })
    return res.status(500).json({
      success: false,
      message: 'Failed to execute job',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
} 