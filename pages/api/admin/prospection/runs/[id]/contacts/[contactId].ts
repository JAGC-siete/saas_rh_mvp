import { NextApiRequest, NextApiResponse } from 'next'
import { requireSuperAdminWithAudit } from '../../../../../../../lib/auth/api-guards'
import { createSuccessResponse, createErrorResponse } from '../../../../../../../lib/security/api-responses'
import { logger } from '../../../../../../../lib/logger'
import {
  isValidConfidence,
  normalizeProspectEmail,
} from '../../../../../../../lib/admin/prospection'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const runId = String(req.query.id || '')
  const contactId = String(req.query.contactId || '')
  if (!runId || !contactId) {
    return res.status(400).json(createErrorResponse('id and contactId are required', 'VALIDATION_ERROR'))
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

    if (req.method === 'PATCH') {
      const patch: Record<string, unknown> = {}

      if (req.body?.comercio != null) {
        const comercio = String(req.body.comercio).trim()
        if (!comercio) {
          return res
            .status(400)
            .json(createErrorResponse('comercio cannot be empty', 'VALIDATION_ERROR'))
        }
        patch.comercio = comercio
      }
      if (req.body?.rubro !== undefined) {
        patch.rubro = req.body.rubro ? String(req.body.rubro).trim() : null
      }
      if (req.body?.telefono !== undefined) {
        patch.telefono = req.body.telefono ? String(req.body.telefono).trim() : null
      }
      if (req.body?.direccion !== undefined) {
        patch.direccion = req.body.direccion ? String(req.body.direccion).trim() : null
      }
      if (req.body?.fuentes !== undefined) {
        patch.fuentes = req.body.fuentes ? String(req.body.fuentes).trim() : null
      }
      if (req.body?.notas !== undefined) {
        patch.notas = req.body.notas ? String(req.body.notas).trim() : null
      }
      if (req.body?.confianza != null) {
        if (!isValidConfidence(req.body.confianza)) {
          return res.status(400).json(createErrorResponse('Invalid confianza', 'VALIDATION_ERROR'))
        }
        patch.confianza = req.body.confianza
      }
      if (req.body?.email !== undefined) {
        const emailRaw = req.body.email ? String(req.body.email).trim() : null
        const normalized = normalizeProspectEmail(emailRaw)
        patch.email = emailRaw
        patch.email_normalized = normalized
      }

      if (Object.keys(patch).length === 0) {
        return res.status(400).json(createErrorResponse('No fields to update', 'VALIDATION_ERROR'))
      }

      const { data, error } = await adminClient
        .from('b2b_prospect_contacts')
        .update(patch)
        .eq('id', contactId)
        .eq('run_id', runId)
        .select('*')
        .maybeSingle()

      if (error) {
        return res.status(500).json(createErrorResponse(error.message, 'DB_ERROR'))
      }
      if (!data) {
        return res.status(404).json(createErrorResponse('Contact not found', 'NOT_FOUND'))
      }

      await auditLog('b2b_prospection_contact_patch', { runId, contactId })
      return res.status(200).json(createSuccessResponse({ contact: data }))
    }

    if (req.method === 'DELETE') {
      const { error } = await adminClient
        .from('b2b_prospect_contacts')
        .delete()
        .eq('id', contactId)
        .eq('run_id', runId)

      if (error) {
        return res.status(500).json(createErrorResponse(error.message, 'DB_ERROR'))
      }

      await auditLog('b2b_prospection_contact_delete', { runId, contactId })
      return res.status(200).json(createSuccessResponse({ deleted: true }))
    }

    return res.status(405).json(createErrorResponse('Method Not Allowed', 'METHOD_NOT_ALLOWED'))
  } catch (err) {
    if (res.headersSent) return
    const message = err instanceof Error ? err.message : String(err)
    logger.error('prospection contact [id] handler error', { error: message, runId, contactId })
    return res.status(500).json(createErrorResponse(message, 'INTERNAL_ERROR'))
  }
}
