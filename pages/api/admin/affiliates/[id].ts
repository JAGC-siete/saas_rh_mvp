import { NextApiRequest, NextApiResponse } from 'next'
import { requireSuperAdminWithAudit } from '../../../../lib/auth/api-guards'
import { createSuccessResponse, createErrorResponse, createValidationErrorResponse } from '../../../../lib/security/api-responses'
import { logger } from '../../../../lib/logger'

/**
 * Update affiliate status
 * Requires super admin authentication
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') {
    return res.status(405).json(createErrorResponse('Method Not Allowed', 'METHOD_NOT_ALLOWED'))
  }

  try {
    // Authenticate and get admin context with audit logging
    const { adminClient, auditLog } = await requireSuperAdminWithAudit(req, res)

    const { id } = req.query
    const { status, autoApprove } = req.body

    // Validate affiliate ID
    if (!id || typeof id !== 'string') {
      return res.status(400).json(createValidationErrorResponse({
        id: 'ID de afiliado requerido y debe ser un string válido'
      }))
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      return res.status(400).json(createValidationErrorResponse({
        id: 'ID de afiliado debe ser un UUID válido'
      }))
    }

    // Determine final status (autoApprove takes precedence)
    const finalStatus = autoApprove === true ? 'approved' : status

    // Validate status
    const validStatuses = ['approved', 'rejected']
    if (!finalStatus || !validStatuses.includes(finalStatus)) {
      return res.status(400).json(createValidationErrorResponse({
        status: `Estado inválido. Debe ser uno de: ${validStatuses.join(', ')}`
      }))
    }

    // Check if affiliate exists
    const { data: existingAffiliate, error: fetchError } = await adminClient
      .from('affiliates')
      .select('id, status, user_id')
      .eq('id', id)
      .single()

    if (fetchError || !existingAffiliate) {
      logger.warn('Affiliate not found for status update', {
        affiliate_id: id,
        error: fetchError?.message
      })
      return res.status(404).json(createErrorResponse(
        'Afiliado no encontrado',
        'NOT_FOUND',
        { affiliate_id: id }
      ))
    }

    // Update affiliate status
    const { error: updateError } = await adminClient
      .from('affiliates')
      .update({ status: finalStatus })
      .eq('id', id)

    if (updateError) {
      logger.error('Error updating affiliate status', {
        affiliate_id: id,
        newStatus: finalStatus,
        error: updateError?.message || String(updateError)
      })
      throw updateError
    }

    // Audit log
    try {
      await auditLog('affiliate_status_updated', {
        affiliate_id: id,
        user_id: existingAffiliate.user_id,
        oldStatus: existingAffiliate.status,
        newStatus: finalStatus,
        autoApprove: autoApprove === true
      })
    } catch (auditError: any) {
      logger.warn('Error logging audit (continuing)', {
        error: auditError?.message || String(auditError)
      })
    }

    return res.status(200).json(createSuccessResponse({
      message: 'Estado del afiliado actualizado correctamente.',
      affiliate_id: id,
      old_status: existingAffiliate.status,
      new_status: finalStatus
    }))
  } catch (error: any) {
    // Handle auth errors (already sent response)
    if (error.message === 'UNAUTHORIZED' || error.message === 'INSUFFICIENT_PERMISSIONS') {
      return // Response already sent by guard
    }

    logger.error('Unexpected error updating affiliate status', {
      error: error.message,
      stack: error.stack,
      affiliate_id: req.query?.id
    })

    return res.status(500).json(createErrorResponse(
      'An internal server error occurred',
      'INTERNAL_ERROR',
      { details: error.message }
    ))
  }
}
