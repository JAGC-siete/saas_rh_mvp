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

    // Get all subscriptions for statistics
    // Note: For large datasets, consider adding pagination or caching
    const { data: subscriptions, error: subscriptionsError } = await adminClient
      .from('mail_list_subscriptions')
      .select('id, status, source, created_at, confirmed_at')

    if (subscriptionsError) {
      logger.error('Error fetching subscriptions for stats', {
        userId: user.id,
        error: subscriptionsError.message
      })
      throw subscriptionsError
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
        const createdDate = new Date(s.created_at)
        return createdDate.getFullYear() === year && createdDate.getMonth() === month
      })

      const confirmed = monthSubs.filter((s: any) => s.status === 'confirmed').length

      return {
        month: `${year}-${String(month + 1).padStart(2, '0')}`,
        total: monthSubs.length,
        confirmed
      }
    }).reverse()

    // Audit log the stats access
    await auditLog('mail_list_stats_accessed', {
      totalSubscriptions: subscriptionsByStatus.total,
      timestamp: new Date().toISOString()
    })

    return res.status(200).json(createSuccessResponse({
      subscriptionsByStatus,
      conversionRate: Math.round(conversionRate * 100) / 100, // Round to 2 decimals
      subscriptionsBySource,
      monthlyGrowth
    }))
  } catch (error: any) {
    // Handle auth errors (already sent response)
    if (error.message === 'UNAUTHORIZED' || error.message === 'INSUFFICIENT_PERMISSIONS') {
      return // Response already sent by guard
    }

    logger.error('Unexpected error fetching mail list stats', {
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








