import { NextApiRequest, NextApiResponse } from 'next'
import { requireSuperAdminWithAudit } from '../../../../../lib/auth/api-guards'
import { createSuccessResponse, createErrorResponse, createValidationErrorResponse } from '../../../../../lib/security/api-responses'
import { logger } from '../../../../../lib/logger'

/**
 * Update commission status
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
    const { status } = req.body

    // Validate commission ID
    if (!id || typeof id !== 'string') {
      return res.status(400).json(createValidationErrorResponse({
        id: 'ID de comisión requerido y debe ser un string válido'
      }))
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      return res.status(400).json(createValidationErrorResponse({
        id: 'ID de comisión debe ser un UUID válido'
      }))
    }

    // Validate status
    const validStatuses = ['pending', 'paid', 'cancelled']
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json(createValidationErrorResponse({
        status: `Estado inválido. Debe ser uno de: ${validStatuses.join(', ')}`
      }))
    }

    // Check if commission exists
    const { data: existingCommission, error: fetchError } = await adminClient
      .from('commissions')
      .select('id, status, affiliate_id, amount')
      .eq('id', id)
      .single()

    if (fetchError || !existingCommission) {
      logger.warn('Commission not found for status update', {
        commission_id: id,
        error: fetchError?.message
      })
      return res.status(404).json(createErrorResponse(
        'Comisión no encontrada',
        'NOT_FOUND',
        { commission_id: id }
      ))
    }

    // Prepare update data
    const updateData: any = { status }
    if (status === 'paid') {
      updateData.paid_at = new Date().toISOString()
    } else if (status !== 'paid' && existingCommission.status === 'paid') {
      // If changing from paid to another status, clear paid_at
      updateData.paid_at = null
    }

    // Update commission
    const { error: updateError } = await adminClient
      .from('commissions')
      .update(updateData)
      .eq('id', id)

    if (updateError) {
      logger.error('Error updating commission status', {
        commission_id: id,
        newStatus: status,
        error: updateError?.message || String(updateError)
      })
      throw updateError
    }

    // Audit log
    try {
      await auditLog('commission_status_updated', {
        commission_id: id,
        affiliate_id: existingCommission.affiliate_id,
        oldStatus: existingCommission.status,
        newStatus: status,
        amount: existingCommission.amount
      })
    } catch (auditError: any) {
      logger.warn('Error logging audit (continuing)', {
        error: auditError?.message || String(auditError)
      })
    }

    return res.status(200).json(createSuccessResponse({
      message: 'Comisión actualizada correctamente.',
      commission_id: id,
      old_status: existingCommission.status,
      new_status: status
    }))
  } catch (error: any) {
    // Handle auth errors (already sent response)
    if (error.message === 'UNAUTHORIZED' || error.message === 'INSUFFICIENT_PERMISSIONS') {
      return // Response already sent by guard
    }

    logger.error('Unexpected error updating commission status', {
      error: error.message,
      stack: error.stack,
      commission_id: req.query?.id
    })

    return res.status(500).json(createErrorResponse(
      'An internal server error occurred',
      'INTERNAL_ERROR',
      { details: error.message }
    ))
  }
}








