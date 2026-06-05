import { NextApiRequest, NextApiResponse } from 'next'
import { requireSuperAdminWithAudit } from '../../../../lib/auth/api-guards'
import { createErrorResponse } from '../../../../lib/security/api-responses'
import { logger } from '../../../../lib/logger'
import {
  MARKETING_STATUS_LABELS,
  marketingStepLabel,
  type MarketingLeadStatus,
} from '../../../../lib/marketing/admin-present'

const VALID_STATUSES = ['active', 'completed', 'unsubscribed'] as const
const EXPORT_CAP = 10_000

function csvEscape(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json(createErrorResponse('Method Not Allowed', 'METHOD_NOT_ALLOWED'))
  }

  try {
    const { adminClient, user, auditLog } = await requireSuperAdminWithAudit(req, res)

    if (!user?.id) {
      return res.status(500).json(createErrorResponse('Authentication error', 'AUTH_ERROR'))
    }

    const status = req.query.status as string | undefined
    const source = req.query.source as string | undefined
    const search = (req.query.search as string | undefined)?.trim() || ''

    if (status && !VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
      return res.status(400).json(createErrorResponse('Invalid status', 'VALIDATION_ERROR'))
    }

    let query = adminClient
      .from('marketing_leads')
      .select(
        `
        email,
        status,
        source,
        current_step,
        created_at,
        last_mail_sent_at,
        unsubscribed_at,
        marketing_email_ledger(count)
      `
      )
      .order('created_at', { ascending: false })
      .limit(EXPORT_CAP)

    if (status) query = query.eq('status', status)
    if (source) query = query.eq('source', source)
    if (search) query = query.ilike('email', `%${search.substring(0, 100)}%`)

    const { data: rows, error } = await query

    if (error) {
      logger.error('Marketing leads export failed', { error: error.message })
      return res.status(500).json(createErrorResponse('Export failed', 'DATABASE_ERROR'))
    }

    const headers = [
      'Email',
      'Estado',
      'Paso secuencia',
      'Emails enviados',
      'Fuente',
      'Fecha suscripción',
      'Último email',
      'Fecha baja',
    ]

    const lines = [headers.map(csvEscape).join(',')]

    for (const row of rows || []) {
      const statusKey = row.status as MarketingLeadStatus
      const label = MARKETING_STATUS_LABELS[statusKey] || row.status
      const sent =
        Array.isArray(row.marketing_email_ledger) && row.marketing_email_ledger[0]?.count != null
          ? String(row.marketing_email_ledger[0].count)
          : '0'

      lines.push(
        [
          row.email,
          label,
          marketingStepLabel(Number(row.current_step) || 0),
          sent,
          row.source || '',
          row.created_at ? new Date(row.created_at).toISOString() : '',
          row.last_mail_sent_at ? new Date(row.last_mail_sent_at).toISOString() : '',
          row.unsubscribed_at ? new Date(row.unsubscribed_at).toISOString() : '',
        ]
          .map(v => csvEscape(String(v)))
          .join(',')
      )
    }

    try {
      await auditLog('marketing_leads_exported', {
        rowCount: rows?.length ?? 0,
        filters: { status: status || 'all', source: source || 'all', search: search ? 'yes' : 'no' },
      })
    } catch {
      /* audit optional */
    }

    const filename = `marketing-leads-${new Date().toISOString().split('T')[0]}.csv`
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    return res.status(200).send(lines.join('\n'))
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === 'UNAUTHORIZED' || error.message === 'INSUFFICIENT_PERMISSIONS')) {
      return
    }
    if (res.headersSent) return

    const message = error instanceof Error ? error.message : String(error)
    logger.error('Unexpected export error', { error: message })
    return res.status(500).json(createErrorResponse('Internal error', 'INTERNAL_ERROR'))
  }
}
