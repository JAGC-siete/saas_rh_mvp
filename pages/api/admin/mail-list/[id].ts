import { NextApiRequest, NextApiResponse } from 'next'
import { requireSuperAdminWithAudit } from '../../../../lib/auth/api-guards'
import { createSuccessResponse, createErrorResponse, createValidationErrorResponse } from '../../../../lib/security/api-responses'
import { logger } from '../../../../lib/logger'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type LeadRow = {
  id: string
  email: string
  source: string | null
  status: string
  current_step: number
  unsubscribed_at: string | null
}

function parseLeadId(req: NextApiRequest): string | null {
  const rawId = req.query.id
  const id = Array.isArray(rawId) ? rawId[0] : rawId
  if (!id || typeof id !== 'string' || !UUID_REGEX.test(id)) return null
  return id
}

/**
 * PATCH: mark lead as unsubscribed (stops email sequence, keeps record).
 * DELETE: remove lead and related records (ledger, mission events cascade).
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH' && req.method !== 'DELETE') {
    res.setHeader('Allow', ['PATCH', 'DELETE'])
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

    const id = parseLeadId(req)
    if (!id) {
      return res.status(400).json(createValidationErrorResponse({ id: 'ID de lead inválido' }))
    }

    const { data: existing, error: fetchError } = await adminClient
      .from('marketing_leads')
      .select('id, email, source, status, current_step, unsubscribed_at')
      .eq('id', id)
      .maybeSingle()

    if (fetchError) {
      logger.error(`Error fetching marketing lead for ${req.method}`, {
        userId: user.id,
        leadId: id,
        error: fetchError.message,
      })
      return res.status(500).json(
        createErrorResponse('Error al buscar el lead', 'DATABASE_ERROR', { details: fetchError.message })
      )
    }

    if (!existing) {
      return res.status(404).json(createErrorResponse('Lead no encontrado', 'NOT_FOUND', { leadId: id }))
    }

    if (req.method === 'PATCH') {
      return handleUnsubscribe(res, adminClient, user.id, existing as LeadRow, auditLog)
    }

    return handleDelete(res, adminClient, user.id, existing as LeadRow, auditLog)
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === 'UNAUTHORIZED' || error.message === 'INSUFFICIENT_PERMISSIONS')) {
      return
    }
    if (res.headersSent) return

    const message = error instanceof Error ? error.message : String(error)
    logger.error('Unexpected error in marketing lead admin action', { error: message, method: req.method })

    return res.status(500).json(
      createErrorResponse('An internal server error occurred', 'INTERNAL_ERROR', { details: message })
    )
  }
}

async function handleUnsubscribe(
  res: NextApiResponse,
  adminClient: Awaited<ReturnType<typeof requireSuperAdminWithAudit>>['adminClient'],
  userId: string,
  existing: LeadRow,
  auditLog: Awaited<ReturnType<typeof requireSuperAdminWithAudit>>['auditLog']
) {
  const now = new Date().toISOString()
  const alreadyUnsubscribed = existing.status === 'unsubscribed'

  if (!alreadyUnsubscribed) {
    const { error: updateError } = await adminClient
      .from('marketing_leads')
      .update({
        status: 'unsubscribed',
        unsubscribed_at: now,
      })
      .eq('id', existing.id)

    if (updateError) {
      logger.error('Error unsubscribing marketing lead', {
        userId,
        leadId: existing.id,
        error: updateError.message,
      })
      return res.status(500).json(
        createErrorResponse('Error al desuscribir el lead', 'DATABASE_ERROR', { details: updateError.message })
      )
    }
  }

  try {
    await auditLog('marketing_lead_unsubscribed', {
      leadId: existing.id,
      email: existing.email,
      source: existing.source,
      previousStatus: existing.status,
      adminAction: true,
      alreadyUnsubscribed,
    })
  } catch (auditError: unknown) {
    const message = auditError instanceof Error ? auditError.message : String(auditError)
    logger.warn('Error logging audit after lead unsubscribe (continuing)', { error: message })
  }

  logger.info('Marketing lead unsubscribed by admin', {
    userId,
    leadId: existing.id,
    email: existing.email,
    alreadyUnsubscribed,
  })

  return res.status(200).json(
    createSuccessResponse({
      unsubscribed: true,
      id: existing.id,
      status: 'unsubscribed' as const,
      unsubscribed_at: alreadyUnsubscribed ? existing.unsubscribed_at ?? now : now,
      alreadyUnsubscribed,
    })
  )
}

async function handleDelete(
  res: NextApiResponse,
  adminClient: Awaited<ReturnType<typeof requireSuperAdminWithAudit>>['adminClient'],
  userId: string,
  existing: LeadRow,
  auditLog: Awaited<ReturnType<typeof requireSuperAdminWithAudit>>['auditLog']
) {
  const { error: deleteError } = await adminClient.from('marketing_leads').delete().eq('id', existing.id)

  if (deleteError) {
    logger.error('Error deleting marketing lead', {
      userId,
      leadId: existing.id,
      error: deleteError.message,
    })
    return res.status(500).json(
      createErrorResponse('Error al eliminar el lead', 'DATABASE_ERROR', { details: deleteError.message })
    )
  }

  try {
    await auditLog('marketing_lead_deleted', {
      leadId: existing.id,
      email: existing.email,
      source: existing.source,
      status: existing.status,
      current_step: existing.current_step,
    })
  } catch (auditError: unknown) {
    const message = auditError instanceof Error ? auditError.message : String(auditError)
    logger.warn('Error logging audit after lead delete (continuing)', { error: message })
  }

  logger.info('Marketing lead deleted', {
    userId,
    leadId: existing.id,
    email: existing.email,
  })

  return res.status(200).json(createSuccessResponse({ deleted: true, id: existing.id }))
}
