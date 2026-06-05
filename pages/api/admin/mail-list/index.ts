import { NextApiRequest, NextApiResponse } from 'next'
import { requireSuperAdminWithAudit } from '../../../../lib/auth/api-guards'
import { createSuccessResponse, createErrorResponse } from '../../../../lib/security/api-responses'
import { logger } from '../../../../lib/logger'

const VALID_STATUSES = ['active', 'completed', 'unsubscribed'] as const
const VALID_ORDER_BY = [
  'created_at',
  'email',
  'status',
  'source',
  'current_step',
  'last_mail_sent_at',
  'unsubscribed_at',
] as const

type MarketingLeadRow = {
  id: string
  email: string
  source: string | null
  status: string
  current_step: number
  last_mail_sent_at: string | null
  unsubscribed_at: string | null
  created_at: string
  marketing_email_ledger?: { count: number }[]
}

function emailsSentCount(row: MarketingLeadRow): number {
  const nested = row.marketing_email_ledger
  if (Array.isArray(nested) && nested[0]?.count != null) {
    return Number(nested[0].count) || 0
  }
  return 0
}

function serializeLead(row: MarketingLeadRow) {
  const { marketing_email_ledger: _ledger, ...rest } = row
  return {
    ...rest,
    emails_sent_count: emailsSentCount(row),
  }
}

/**
 * List marketing leads (email sequence) with filtering, search, and pagination.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json(createErrorResponse('Method Not Allowed', 'METHOD_NOT_ALLOWED'))
  }

  try {
    const { adminClient, user, auditLog } = await requireSuperAdminWithAudit(req, res)

    if (!user?.id) {
      return res.status(500).json(
        createErrorResponse('Authentication error', 'AUTH_ERROR', {
          details: 'User information not available',
        })
      )
    }

    const status = req.query.status as string | undefined
    const source = req.query.source as string | undefined
    const search = (req.query.search as string | undefined)?.trim() || ''
    const pageParam = Number(req.query.page || 1)
    const pageSizeParam = Number(req.query.pageSize || 50)
    const orderBy = (req.query.orderBy as string) || 'created_at'
    const orderDir = ((req.query.orderDir as string) || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc'

    if (status && !VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
      return res.status(400).json(
        createErrorResponse(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`, 'VALIDATION_ERROR')
      )
    }

    if (!VALID_ORDER_BY.includes(orderBy as (typeof VALID_ORDER_BY)[number])) {
      return res.status(400).json(
        createErrorResponse(`Invalid orderBy. Must be one of: ${VALID_ORDER_BY.join(', ')}`, 'VALIDATION_ERROR')
      )
    }

    const page = Math.max(1, isFinite(pageParam) ? pageParam : 1)
    const pageSize = Math.min(100, Math.max(1, isFinite(pageSizeParam) ? pageSizeParam : 50))
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    const sanitizedSearch = search.length > 100 ? search.substring(0, 100) : search
    const sanitizedSource = source && source.length > 50 ? source.substring(0, 50) : source

    let query = adminClient
      .from('marketing_leads')
      .select(
        `
        id,
        email,
        source,
        status,
        current_step,
        last_mail_sent_at,
        unsubscribed_at,
        created_at,
        marketing_email_ledger(count)
      `,
        { count: 'exact' }
      )
      .order(orderBy, { ascending: orderDir === 'asc' })

    if (status) query = query.eq('status', status)
    if (sanitizedSource) query = query.eq('source', sanitizedSource)
    if (sanitizedSearch) query = query.ilike('email', `%${sanitizedSearch}%`)

    const { data: rows, error, count } = await query.range(from, to)

    if (error) {
      logger.error('Error fetching marketing leads', {
        userId: user.id,
        error: error.message,
      })
      return res.status(500).json(
        createErrorResponse('Error al obtener leads de marketing', 'DATABASE_ERROR', {
          details: error.message,
        })
      )
    }

    const { data: sourceRows } = await adminClient.from('marketing_leads').select('source')
    const availableSources = Array.from(
      new Set(
        (sourceRows || [])
          .map((r: { source: string | null }) => r.source)
          .filter((s): s is string => Boolean(s && s.trim()))
      )
    ).sort()

    try {
      await auditLog('marketing_leads_accessed', {
        filters: {
          status: status || 'all',
          source: sanitizedSource || 'all',
          search: sanitizedSearch ? 'yes' : 'no',
          page,
          pageSize,
          totalResults: count || 0,
        },
      })
    } catch (auditError: unknown) {
      const message = auditError instanceof Error ? auditError.message : String(auditError)
      logger.warn('Error logging audit (continuing)', { error: message })
    }

    const leads = ((rows || []) as MarketingLeadRow[]).map(serializeLead)

    return res.status(200).json(
      createSuccessResponse({
        leads,
        subscriptions: leads,
        availableSources,
        pagination: {
          page,
          pageSize,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / pageSize),
        },
      })
    )
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === 'UNAUTHORIZED' || error.message === 'INSUFFICIENT_PERMISSIONS')) {
      return
    }
    if (res.headersSent) return

    const message = error instanceof Error ? error.message : String(error)
    logger.error('Unexpected error fetching marketing leads', { error: message })

    return res.status(500).json(
      createErrorResponse('An internal server error occurred', 'INTERNAL_ERROR', { details: message })
    )
  }
}
