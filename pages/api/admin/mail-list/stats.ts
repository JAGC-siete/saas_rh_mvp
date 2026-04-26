import { NextApiRequest, NextApiResponse } from 'next'
import { requireSuperAdminWithAudit } from '../../../../lib/auth/api-guards'
import { createSuccessResponse, createErrorResponse } from '../../../../lib/security/api-responses'
import { logger } from '../../../../lib/logger'

/**
 * Get mail list statistics
 * Requires super admin authentication
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json(createErrorResponse('Method Not Allowed', 'METHOD_NOT_ALLOWED'))
  }

  try {
    // Authenticate and get admin context with audit logging
    const { adminClient, user, auditLog } = await requireSuperAdminWithAudit(req, res)

    // Validate user exists (should always be present after auth, but be defensive)
    if (!user || !user.id) {
      logger.error('User not available after authentication', {
        hasUser: !!user,
        userId: user?.id
      })
      return res.status(500).json(createErrorResponse(
        'Authentication error',
        'AUTH_ERROR',
        { details: 'User information not available' }
      ))
    }

    // Get all subscriptions for statistics
    // Note: For large datasets, consider adding pagination or caching
    const { data: subscriptions, error: subscriptionsError } = await adminClient
      .from('mail_list_subscriptions')
      .select('id, status, source, created_at, confirmed_at')

    if (subscriptionsError) {
      logger.error('Error fetching subscriptions for stats', {
        userId: user?.id || 'unknown',
        error: subscriptionsError?.message || String(subscriptionsError),
        code: subscriptionsError?.code
      })
      return res.status(500).json(createErrorResponse(
        'Error al obtener estadísticas de la base de datos',
        'DATABASE_ERROR',
        { details: subscriptionsError?.message || String(subscriptionsError) }
      ))
    }

    const subscriptionsData = subscriptions || []

    // Calculate statistics by status
    const subscriptionsByStatus = {
      pending: subscriptionsData.filter((s: any) => s.status === 'pending').length,
      confirmed: subscriptionsData.filter((s: any) => s.status === 'confirmed').length,
      unsubscribed: subscriptionsData.filter((s: any) => s.status === 'unsubscribed').length,
      total: subscriptionsData.length
    }

    // Calculate conversion rate (confirmed / total)
    const conversionRate = subscriptionsByStatus.total > 0
      ? (subscriptionsByStatus.confirmed / subscriptionsByStatus.total) * 100
      : 0

    // Calculate subscriptions by source
    const subscriptionsBySource = subscriptionsData.reduce((acc: any, sub: any) => {
      const source = sub.source || 'unknown'
      acc[source] = (acc[source] || 0) + 1
      return acc
    }, {})

    // Calculate monthly growth (last 12 months)
    const monthlyGrowth = Array.from({ length: 12 }, (_, i) => {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      const year = date.getFullYear()
      const month = date.getMonth()
      
      const monthSubs = subscriptionsData.filter((s: any) => {
        if (!s.created_at) return false
        try {
          const createdDate = new Date(s.created_at)
          if (isNaN(createdDate.getTime())) return false
          return createdDate.getFullYear() === year && createdDate.getMonth() === month
        } catch {
          return false
        }
      })

      const confirmed = monthSubs.filter((s: any) => s.status === 'confirmed').length

      return {
        month: `${year}-${String(month + 1).padStart(2, '0')}`,
        total: monthSubs.length,
        confirmed
      }
    }).reverse()

    // Audit log the stats access (protected - don't fail endpoint if audit fails)
    try {
      await auditLog('mail_list_stats_accessed', {
        totalSubscriptions: subscriptionsByStatus.total,
        timestamp: new Date().toISOString()
      })
    } catch (auditError: any) {
      logger.warn('Error logging audit (continuing)', {
        error: auditError?.message || String(auditError)
      })
    }

    return res.status(200).json(createSuccessResponse({
      subscriptionsByStatus,
      conversionRate: Math.round(conversionRate * 100) / 100, // Round to 2 decimals
      subscriptionsBySource,
      monthlyGrowth
    }))
  } catch (error: any) {
    // Handle auth errors (already sent response)
    if (error?.message === 'UNAUTHORIZED' || error?.message === 'INSUFFICIENT_PERMISSIONS') {
      return // Response already sent by guard
    }

    // Check if response was already sent
    if (res.headersSent) {
      logger.error('Error after response sent in mail-list stats', {
        error: error?.message || String(error)
      })
      return
    }

    logger.error('Unexpected error fetching mail list stats', {
      error: error?.message || String(error),
      stack: error?.stack
    })

    return res.status(500).json(createErrorResponse(
      'An internal server error occurred',
      'INTERNAL_ERROR',
      { details: error?.message || 'Unknown error' }
    ))
  }
}








