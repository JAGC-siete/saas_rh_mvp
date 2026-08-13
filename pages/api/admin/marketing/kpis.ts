import { NextApiRequest, NextApiResponse } from 'next'
import { requireSuperAdminWithAudit } from '../../../../lib/auth/api-guards'
import { createSuccessResponse, createErrorResponse } from '../../../../lib/security/api-responses'
import { logger } from '../../../../lib/logger'
import {
  fetchMarketingKpis,
  parseMarketingKpiDays,
} from '../../../../lib/admin/marketing-kpis'

/**
 * Marketing conversion KPIs for super-admin (leads, sequence, email, commercial).
 * Query: ?days=7|30|90 (default 30).
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

    const days = parseMarketingKpiDays(req.query.days)

    let payload
    try {
      payload = await fetchMarketingKpis(adminClient, days)
    } catch (dbError: unknown) {
      const message = dbError instanceof Error ? dbError.message : String(dbError)
      logger.error('Error fetching marketing KPIs', { userId: user.id, error: message })
      return res.status(500).json(
        createErrorResponse('Error al obtener KPIs de marketing', 'DATABASE_ERROR', {
          details: message,
        })
      )
    }

    try {
      await auditLog('marketing_kpis_accessed', {
        days,
        leadsTotal: payload.leads.total,
        timestamp: new Date().toISOString(),
      })
    } catch (auditError: unknown) {
      const message = auditError instanceof Error ? auditError.message : String(auditError)
      logger.warn('Error logging audit (continuing)', { error: message })
    }

    return res.status(200).json(createSuccessResponse(payload))
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      (error.message === 'UNAUTHORIZED' || error.message === 'INSUFFICIENT_PERMISSIONS')
    ) {
      return
    }
    if (res.headersSent) return

    const message = error instanceof Error ? error.message : String(error)
    logger.error('Unexpected error fetching marketing KPIs', { error: message })

    return res.status(500).json(
      createErrorResponse('An internal server error occurred', 'INTERNAL_ERROR', {
        details: message,
      })
    )
  }
}
