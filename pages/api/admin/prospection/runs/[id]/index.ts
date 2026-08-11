import { NextApiRequest, NextApiResponse } from 'next'
import { requireSuperAdminWithAudit } from '../../../../../../lib/auth/api-guards'
import { createSuccessResponse, createErrorResponse } from '../../../../../../lib/security/api-responses'
import { logger } from '../../../../../../lib/logger'
import {
  B2B_PROSPECT_RUN_STATUSES,
  isStuckSending,
  parseRubrosInput,
  type B2bProspectRunStatus,
} from '../../../../../../lib/admin/prospection'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const runId = String(req.query.id || '')
  if (!runId) {
    return res.status(400).json(createErrorResponse('id is required', 'VALIDATION_ERROR'))
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

    if (req.method === 'GET') {
      let { data: run, error } = await adminClient
        .from('b2b_prospect_runs')
        .select('*')
        .eq('id', runId)
        .maybeSingle()

      if (error) {
        return res.status(500).json(createErrorResponse(error.message, 'DB_ERROR'))
      }
      if (!run) {
        return res.status(404).json(createErrorResponse('Run not found', 'NOT_FOUND'))
      }

      if (isStuckSending(run)) {
        const { data: recovered } = await adminClient
          .from('b2b_prospect_runs')
          .update({ status: 'ready' })
          .eq('id', runId)
          .select('*')
          .maybeSingle()
        if (recovered) run = recovered
      }

      const { data: contacts, error: contactsError } = await adminClient
        .from('b2b_prospect_contacts')
        .select('*')
        .eq('run_id', runId)
        .order('created_at', { ascending: true })

      if (contactsError) {
        return res.status(500).json(createErrorResponse(contactsError.message, 'DB_ERROR'))
      }

      const { data: ledger, error: ledgerError } = await adminClient
        .from('b2b_prospect_email_ledger')
        .select('*')
        .eq('run_id', runId)
        .order('sent_at', { ascending: false })
        .limit(200)

      if (ledgerError) {
        return res.status(500).json(createErrorResponse(ledgerError.message, 'DB_ERROR'))
      }

      await auditLog('b2b_prospection_run_get', { runId })
      return res.status(200).json(
        createSuccessResponse({
          run,
          contacts: contacts || [],
          ledger: ledger || [],
        })
      )
    }

    if (req.method === 'PATCH') {
      const patch: Record<string, unknown> = {}

      if (req.body?.ciudad != null) {
        const ciudad = String(req.body.ciudad).trim()
        if (!ciudad) {
          return res.status(400).json(createErrorResponse('ciudad cannot be empty', 'VALIDATION_ERROR'))
        }
        patch.ciudad = ciudad
      }
      if (req.body?.departamento !== undefined) {
        patch.departamento = req.body.departamento
          ? String(req.body.departamento).trim()
          : null
      }
      if (req.body?.pais != null) {
        patch.pais = String(req.body.pais).trim() || 'Honduras'
      }
      if (req.body?.rubros !== undefined) {
        patch.rubros = parseRubrosInput(req.body.rubros)
      }
      if (req.body?.email_subject != null) {
        const subject = String(req.body.email_subject).trim()
        if (!subject) {
          return res
            .status(400)
            .json(createErrorResponse('email_subject cannot be empty', 'VALIDATION_ERROR'))
        }
        patch.email_subject = subject
      }
      if (req.body?.email_body != null) {
        const body = String(req.body.email_body)
        if (!body.trim()) {
          return res
            .status(400)
            .json(createErrorResponse('email_body cannot be empty', 'VALIDATION_ERROR'))
        }
        patch.email_body = body
      }
      if (req.body?.status != null) {
        const status = String(req.body.status)
        if (!(B2B_PROSPECT_RUN_STATUSES as readonly string[]).includes(status)) {
          return res.status(400).json(
            createErrorResponse(
              `Invalid status. Must be one of: ${B2B_PROSPECT_RUN_STATUSES.join(', ')}`,
              'VALIDATION_ERROR'
            )
          )
        }
        patch.status = status as B2bProspectRunStatus
      }

      if (Object.keys(patch).length === 0) {
        return res.status(400).json(createErrorResponse('No fields to update', 'VALIDATION_ERROR'))
      }

      const { data, error } = await adminClient
        .from('b2b_prospect_runs')
        .update(patch)
        .eq('id', runId)
        .select('*')
        .maybeSingle()

      if (error) {
        return res.status(500).json(createErrorResponse(error.message, 'DB_ERROR'))
      }
      if (!data) {
        return res.status(404).json(createErrorResponse('Run not found', 'NOT_FOUND'))
      }

      await auditLog('b2b_prospection_run_patch', { runId, patch: Object.keys(patch) })
      return res.status(200).json(createSuccessResponse({ run: data }))
    }

    if (req.method === 'DELETE') {
      const { error } = await adminClient.from('b2b_prospect_runs').delete().eq('id', runId)
      if (error) {
        return res.status(500).json(createErrorResponse(error.message, 'DB_ERROR'))
      }
      await auditLog('b2b_prospection_run_delete', { runId })
      return res.status(200).json(createSuccessResponse({ deleted: true }))
    }

    return res.status(405).json(createErrorResponse('Method Not Allowed', 'METHOD_NOT_ALLOWED'))
  } catch (err) {
    if (res.headersSent) return
    const message = err instanceof Error ? err.message : String(err)
    logger.error('prospection run [id] handler error', { error: message, runId })
    return res.status(500).json(createErrorResponse(message, 'INTERNAL_ERROR'))
  }
}
