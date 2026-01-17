import { NextApiRequest, NextApiResponse } from 'next'
import { requireSuperAdminWithAudit } from '../../../../lib/auth/api-guards'
import { createSuccessResponse, createErrorResponse } from '../../../../lib/security/api-responses'
import { logger } from '../../../../lib/logger'

/**
 * List mail list subscriptions with filtering, search, and pagination
 * Requires super admin authentication
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json(createErrorResponse('Method Not Allowed', 'METHOD_NOT_ALLOWED'))
  }

  try {
    // Authenticate and get admin context with audit logging
    const { adminClient, user, auditLog } = await requireSuperAdminWithAudit(req, res)

    // Validate and sanitize query params
    const status = req.query.status as string | undefined
    const source = req.query.source as string | undefined
    const search = (req.query.search as string | undefined)?.trim() || ''
    const pageParam = Number(req.query.page || 1)
    const pageSizeParam = Number(req.query.pageSize || 50)
    const orderBy = (req.query.orderBy as string) || 'created_at'
    const orderDir = ((req.query.orderDir as string) || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc'

    // Validate status if provided
    const validStatuses = ['pending', 'confirmed', 'unsubscribed']
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json(createErrorResponse(
        `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        'VALIDATION_ERROR'
      ))
    }

    // Validate orderBy column (prevent SQL injection)
    const validOrderByColumns = ['created_at', 'email', 'status', 'source', 'confirmed_at', 'unsubscribed_at']
    if (!validOrderByColumns.includes(orderBy)) {
      return res.status(400).json(createErrorResponse(
        `Invalid orderBy column. Must be one of: ${validOrderByColumns.join(', ')}`,
        'VALIDATION_ERROR'
      ))
    }

    // Validate pagination params
    const page = Math.max(1, isFinite(pageParam) ? pageParam : 1)
    const pageSize = Math.min(100, Math.max(1, isFinite(pageSizeParam) ? pageSizeParam : 50))
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    // Sanitize search query (limit length to prevent DoS)
    const sanitizedSearch = search.length > 100 ? search.substring(0, 100) : search

    // Build query
    let query = adminClient
      .from('mail_list_subscriptions')
      .select('*', { count: 'exact' })
      .order(orderBy, { ascending: orderDir === 'asc' })

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }

    if (source) {
      // Sanitize source (limit length)
      const sanitizedSource = source.length > 50 ? source.substring(0, 50) : source
      query = query.eq('source', sanitizedSource)
    }

    // Search by email (if search provided)
    if (sanitizedSearch) {
      query = query.ilike('email', `%${sanitizedSearch}%`)
    }

    // Apply pagination
    const { data: subscriptions, error, count } = await query.range(from, to)

    if (error) {
      logger.error('Error fetching mail list subscriptions', {
        userId: user.id,
        error: error.message,
        status,
        source,
        search: sanitizedSearch,
        page,
        pageSize
      })
      throw error
    }

    // Audit log the access
    await auditLog('mail_list_accessed', {
      filters: {
        status: status || 'all',
        source: source || 'all',
        search: sanitizedSearch ? 'yes' : 'no',
        page,
        pageSize,
        totalResults: count || 0
      }
    })

    return res.status(200).json(createSuccessResponse({
      subscriptions: subscriptions || [],
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

    logger.error('Unexpected error fetching mail list subscriptions', {
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








