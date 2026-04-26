import { NextApiRequest, NextApiResponse } from 'next'
import { requireSuperAdminWithAudit } from '../../../../lib/auth/api-guards'
import { createSuccessResponse, createErrorResponse, createValidationErrorResponse } from '../../../../lib/security/api-responses'
import { logger } from '../../../../lib/logger'

/**
 * Reject an affiliate request
 * Requires super admin authentication
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json(createErrorResponse('Method Not Allowed', 'METHOD_NOT_ALLOWED'))
  }

  try {
    // Authenticate and get admin context with audit logging
    const { adminClient, auditLog } = await requireSuperAdminWithAudit(req, res)

    const { request_id, reason } = req.body

    // Validate request_id
    if (!request_id || typeof request_id !== 'string') {
      return res.status(400).json(createValidationErrorResponse({
        request_id: 'ID de solicitud requerido y debe ser un string válido'
      }))
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(request_id)) {
      return res.status(400).json(createValidationErrorResponse({
        request_id: 'ID de solicitud debe ser un UUID válido'
      }))
    }

    // Validate and sanitize reason
    const sanitizedReason = reason 
      ? (typeof reason === 'string' ? reason.trim().substring(0, 500) : 'No especificado')
      : 'No especificado'

    // Fetch request
    const { data: request, error: fetchError } = await adminClient
      .from('affiliate_requests')
      .select('*')
      .eq('id', request_id)
      .single()

    if (fetchError || !request) {
      logger.warn('Affiliate request not found for rejection', {
        request_id,
        error: fetchError?.message
      })
      return res.status(404).json(createErrorResponse(
        'Solicitud no encontrada',
        'NOT_FOUND',
        { request_id }
      ))
    }

    // Validate request status (cannot reject if already approved)
    if (request.status === 'approved') {
      return res.status(400).json(createErrorResponse(
        'No se puede rechazar una solicitud ya aprobada',
        'INVALID_STATUS',
        { currentStatus: request.status }
      ))
    }

    // Update status to rejected
    const { error: updateError } = await adminClient
      .from('affiliate_requests')
      .update({
        status: 'rejected',
        metadata: {
          ...(request.metadata || {}),
          rejection_reason: sanitizedReason,
          rejected_at: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', request.id)

    if (updateError) {
      logger.error('Error rejecting affiliate request', {
        request_id,
        error: updateError?.message || String(updateError)
      })
      return res.status(500).json(createErrorResponse(
        'Error rechazando la solicitud',
        'UPDATE_FAILED',
        { details: updateError?.message }
      ))
    }

    // Audit log
    try {
      await auditLog('affiliate_request_rejected', {
        request_id,
        email: request.email,
        reason: sanitizedReason
      })
    } catch (auditError: any) {
      logger.warn('Error logging audit (continuing)', {
        error: auditError?.message || String(auditError)
      })
    }

    // TODO: Send rejection email (implement if needed)
    // For now, we only update the status

    return res.status(200).json(createSuccessResponse({
      message: 'Solicitud rechazada exitosamente.'
    }))
  } catch (error: any) {
    // Handle auth errors (already sent response)
    if (error.message === 'UNAUTHORIZED' || error.message === 'INSUFFICIENT_PERMISSIONS') {
      return // Response already sent by guard
    }

    logger.error('Unexpected error rejecting affiliate request', {
      error: error.message,
      stack: error.stack,
      request_id: req.body?.request_id
    })

    return res.status(500).json(createErrorResponse(
      'An internal server error occurred',
      'INTERNAL_ERROR',
      { details: error.message }
    ))
  }
}








