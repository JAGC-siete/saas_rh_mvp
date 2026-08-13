import { NextApiRequest, NextApiResponse } from 'next'
import { requireSuperAdminWithAudit } from '../../../../../lib/auth/api-guards'
import { createSuccessResponse, createErrorResponse } from '../../../../../lib/security/api-responses'
import { logger } from '../../../../../lib/logger'
import {
  DEFAULT_OUTREACH_BODY,
  DEFAULT_OUTREACH_SUBJECT,
  parseRubrosInput,
} from '../../../../../lib/admin/prospection'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { adminClient, user, auditLog } = await requireSuperAdminWithAudit(req, res)
    if (!user?.id) {
      return res.status(500).json(
        createErrorResponse('Authentication error', 'AUTH_ERROR', {
          details: 'User information not available',
        })
      )
    }

    if (req.method === 'GET') {
      const { data, error } = await adminClient
        .from('b2b_prospect_runs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) {
        logger.error('prospection runs list failed', { error: error.message })
        return res.status(500).json(createErrorResponse(error.message, 'DB_ERROR'))
      }

      await auditLog('b2b_prospection_runs_list', { count: data?.length ?? 0 })
      return res.status(200).json(createSuccessResponse({ runs: data || [] }))
    }

    if (req.method === 'POST') {
      const ciudad = String(req.body?.ciudad || '').trim()
      if (!ciudad) {
        return res.status(400).json(createErrorResponse('ciudad is required', 'VALIDATION_ERROR'))
      }

      const departamento = req.body?.departamento
        ? String(req.body.departamento).trim()
        : null
      const pais = String(req.body?.pais || 'Honduras').trim() || 'Honduras'
      const rubros = parseRubrosInput(req.body?.rubros)
      const email_subject = String(req.body?.email_subject || DEFAULT_OUTREACH_SUBJECT).trim()
      const email_body = String(req.body?.email_body || DEFAULT_OUTREACH_BODY)

      if (!email_subject || !email_body.trim()) {
        return res
          .status(400)
          .json(createErrorResponse('email_subject and email_body are required', 'VALIDATION_ERROR'))
      }

      const { data, error } = await adminClient
        .from('b2b_prospect_runs')
        .insert({
          ciudad,
          departamento,
          pais,
          rubros,
          status: 'draft',
          email_subject,
          email_body,
          created_by: user.id,
        })
        .select('*')
        .single()

      if (error) {
        logger.error('prospection run create failed', { error: error.message })
        return res.status(500).json(createErrorResponse(error.message, 'DB_ERROR'))
      }

      await auditLog('b2b_prospection_run_create', { runId: data.id, ciudad, rubros })
      return res.status(201).json(createSuccessResponse({ run: data }))
    }

    return res.status(405).json(createErrorResponse('Method Not Allowed', 'METHOD_NOT_ALLOWED'))
  } catch (err) {
    if (res.headersSent) return
    const message = err instanceof Error ? err.message : String(err)
    logger.error('prospection runs handler error', { error: message })
    return res.status(500).json(createErrorResponse(message, 'INTERNAL_ERROR'))
  }
}
