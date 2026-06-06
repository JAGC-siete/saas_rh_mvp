import { NextApiRequest, NextApiResponse } from 'next'
import { requireSuperAdminWithAudit } from '../../../../lib/auth/api-guards'
import { createSuccessResponse, createErrorResponse } from '../../../../lib/security/api-responses'
import { logger } from '../../../../lib/logger'
import { SEQUENCE_COMPLETE_STEP } from '../../../../lib/marketing/email-sequence-ledger'

type LeadRow = {
  id: string
  status: string
  source: string | null
  created_at: string
  current_step: number
}

/**
 * Marketing leads statistics (email sequence).
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

    const { data: leads, error: leadsError } = await adminClient
      .from('marketing_leads')
      .select('id, status, source, created_at, current_step')

    if (leadsError) {
      logger.error('Error fetching marketing leads for stats', {
        userId: user.id,
        error: leadsError.message,
      })
      return res.status(500).json(
        createErrorResponse('Error al obtener estadísticas', 'DATABASE_ERROR', {
          details: leadsError.message,
        })
      )
    }

    const leadRows = (leads || []) as LeadRow[]

    const leadsByStatus = {
      active: leadRows.filter(l => l.status === 'active').length,
      completed: leadRows.filter(l => l.status === 'completed').length,
      unsubscribed: leadRows.filter(l => l.status === 'unsubscribed').length,
      total: leadRows.length,
    }

    const activeInSequenceRate =
      leadsByStatus.total > 0 ? (leadsByStatus.active / leadsByStatus.total) * 100 : 0

    const leadsByStep: Record<string, number> = {}
    for (const lead of leadRows) {
      const key = String(lead.current_step)
      leadsByStep[key] = (leadsByStep[key] || 0) + 1
    }

    const leadsBySource = leadRows.reduce<Record<string, number>>((acc, lead) => {
      const src = lead.source || 'unknown'
      acc[src] = (acc[src] || 0) + 1
      return acc
    }, {})

    const monthlyGrowth = Array.from({ length: 12 }, (_, i) => {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      const year = date.getFullYear()
      const month = date.getMonth()

      const monthLeads = leadRows.filter(l => {
        if (!l.created_at) return false
        const created = new Date(l.created_at)
        return !isNaN(created.getTime()) && created.getFullYear() === year && created.getMonth() === month
      })

      return {
        month: `${year}-${String(month + 1).padStart(2, '0')}`,
        total: monthLeads.length,
        active: monthLeads.filter(l => l.status === 'active').length,
      }
    }).reverse()

    const { count: emailsSentTotal, error: ledgerError } = await adminClient
      .from('marketing_email_ledger')
      .select('id', { count: 'exact', head: true })

    if (ledgerError) {
      logger.warn('Could not count marketing_email_ledger', { error: ledgerError.message })
    }

    const awaitingWatchman = leadRows.filter(
      l => l.status === 'active' && l.current_step >= 1 && l.current_step < SEQUENCE_COMPLETE_STEP
    ).length

    try {
      await auditLog('marketing_leads_stats_accessed', {
        totalLeads: leadsByStatus.total,
        timestamp: new Date().toISOString(),
      })
    } catch (auditError: unknown) {
      const message = auditError instanceof Error ? auditError.message : String(auditError)
      logger.warn('Error logging audit (continuing)', { error: message })
    }

    return res.status(200).json(
      createSuccessResponse({
        leadsByStatus,
        subscriptionsByStatus: leadsByStatus,
        activeInSequenceRate: Math.round(activeInSequenceRate * 100) / 100,
        conversionRate: Math.round(activeInSequenceRate * 100) / 100,
        leadsByStep,
        leadsBySource,
        subscriptionsBySource: leadsBySource,
        monthlyGrowth,
        emailsSentTotal: emailsSentTotal ?? 0,
        awaitingWatchman,
      })
    )
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === 'UNAUTHORIZED' || error.message === 'INSUFFICIENT_PERMISSIONS')) {
      return
    }
    if (res.headersSent) return

    const message = error instanceof Error ? error.message : String(error)
    logger.error('Unexpected error fetching marketing stats', { error: message })

    return res.status(500).json(
      createErrorResponse('An internal server error occurred', 'INTERNAL_ERROR', { details: message })
    )
  }
}
