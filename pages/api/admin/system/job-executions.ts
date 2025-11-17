import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../../lib/supabase/server'
import { logger } from '../../../../lib/logger'
import { requireSuperAdmin } from '../../../../lib/auth/api-auth-fixed'
import { createSecureErrorResponse } from '../../../../lib/security/error-handling'

interface JobExecutionsResponse {
  success: boolean
  data?: any[]
  metadata?: {
    total: number
    page: number
    pageSize: number
    filters?: any
  }
  error?: string
  message?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<JobExecutionsResponse>
) {
  try {
    // Verify super admin
    await requireSuperAdmin(req, res)

    if (req.method === 'GET') {
      return await getJobExecutions(req, res)
    }

    res.setHeader('Allow', ['GET'])
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      message: `Method ${req.method} not allowed`
    })
  } catch (error: any) {
    // If error from requireSuperAdmin, it already sent response
    if (error.message === 'UNAUTHORIZED' || error.message === 'INSUFFICIENT_PERMISSIONS') {
      return
    }
    logger.error('Error in job-executions admin API', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message || 'Failed to process request'
    })
  }
}

async function getJobExecutions(req: NextApiRequest, res: NextApiResponse<JobExecutionsResponse>) {
  try {
    const adminClient = createAdminClient()

    // Query params for filtering
    const jobName = req.query.job_name as string | undefined
    const status = req.query.status as string | undefined
    const startDate = req.query.start_date as string | undefined
    const endDate = req.query.end_date as string | undefined
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10))
    const pageSize = Math.min(100, Math.max(1, parseInt((req.query.pageSize as string) || '20', 10)))
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    // Base query
    let query = adminClient
      .from('job_executions')
      .select('*', { count: 'exact' })

    // Apply filters
    if (jobName) {
      query = query.eq('job_name', jobName)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (startDate) {
      query = query.gte('started_at', startDate)
    }

    if (endDate) {
      query = query.lte('started_at', endDate)
    }

    // Order and paginate
    query = query.order('started_at', { ascending: false }).range(from, to)

    const { data: executions, error, count } = await query

    if (error) {
      throw error
    }

    // Format response
    const executionsFormatted = executions?.map((execution: any) => ({
      id: execution.id,
      job_name: execution.job_name,
      status: execution.status,
      started_at: execution.started_at,
      completed_at: execution.completed_at,
      duration_ms: execution.duration_ms,
      result: execution.result,
      error_message: execution.error_message,
      created_at: execution.created_at
    })) || []

    logger.info('Job executions retrieved', {
      count: executionsFormatted.length,
      total: count,
      filters: { jobName, status, startDate, endDate }
    })

    return res.status(200).json({
      success: true,
      data: executionsFormatted,
      metadata: {
        total: count || 0,
        page,
        pageSize,
        filters: {
          job_name: jobName || null,
          status: status || null,
          start_date: startDate || null,
          end_date: endDate || null
        }
      }
    })
  } catch (error) {
    logger.error('Error fetching job executions', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch job executions',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

