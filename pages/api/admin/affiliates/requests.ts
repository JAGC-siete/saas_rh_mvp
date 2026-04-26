import { NextApiRequest, NextApiResponse } from 'next'
import { requireSuperAdminWithAudit } from '../../../../lib/auth/api-guards'
import { createSuccessResponse, createErrorResponse } from '../../../../lib/security/api-responses'
import { logger } from '../../../../lib/logger'

/**
 * List affiliate requests
 * Requires super admin authentication
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json(createErrorResponse('Method Not Allowed', 'METHOD_NOT_ALLOWED'))
  }

  try {
    // Authenticate and get admin context with audit logging
    const { adminClient, auditLog } = await requireSuperAdminWithAudit(req, res)

    // Validate and sanitize query params
    const status = req.query.status as string | undefined
    const pageParam = Number(req.query.page || 1)
    const pageSizeParam = Number(req.query.pageSize || 100)
    const page = Math.max(1, isFinite(pageParam) ? pageParam : 1)
    const pageSize = Math.min(500, Math.max(1, isFinite(pageSizeParam) ? pageSizeParam : 100))
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    // Validate status if provided
    const validStatuses = ['pending_email_confirmation', 'pending_approval', 'approved', 'rejected']
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json(createErrorResponse(
        `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        'VALIDATION_ERROR'
      ))
    }

    // Build query
    let query = adminClient
      .from('affiliate_requests')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    // Apply status filter
    if (status) {
      query = query.eq('status', status)
    }

    // Apply pagination
    const { data: requests, error: requestsError, count } = await query.range(from, to)

    if (requestsError) {
      logger.error('Error fetching affiliate requests', {
        error: requestsError?.message || String(requestsError),
        code: requestsError?.code,
        status,
        page,
        pageSize
      })
      throw requestsError
    }

    // Audit log
    try {
      await auditLog('affiliate_requests_listed', {
        count: requests?.length || 0,
        total: count || 0,
        filters: {
          status: status || 'all',
          page,
          pageSize
        }
      })
    } catch (auditError: any) {
      logger.warn('Error logging audit (continuing)', {
        error: auditError?.message || String(auditError)
      })
    }

    return res.status(200).json(createSuccessResponse({
      requests: requests || [],
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize)
      }
    }))
  } catch (error: any) {
    // Handle auth errors (already sent response)
    if (error.message === 'UNAUTHORIZED' || error.message === 'INSUFFICIENT_PERMISSIONS') {
      return // Response already sent by guard
    }

    logger.error('Unexpected error fetching affiliate requests', {
      error: error.message,
      stack: error.stack
    })

    return res.status(500).json(createErrorResponse(
      'An internal server error occurred',
      'INTERNAL_ERROR',
      { details: error.message }
    ))
  }
}








