import { NextApiRequest, NextApiResponse } from 'next'
import { requireSuperAdminWithAudit } from '../../../../lib/auth/api-guards'
import { createSuccessResponse, createErrorResponse, createValidationErrorResponse } from '../../../../lib/security/api-responses'
import { logger } from '../../../../lib/logger'
import { randomBytes } from 'crypto'
import { sendAffiliateWelcomeEmail } from '../../../../lib/emails/affiliate-credentials'

function isAuthDuplicateUserError(err: unknown): boolean {
  const e = err as { message?: string; code?: string }
  const msg = (e?.message || '').toLowerCase()
  const code = (e?.code || '').toLowerCase()
  return (
    code === 'email_exists' ||
    msg.includes('already been registered') ||
    msg.includes('already registered') ||
    msg.includes('user already exists')
  )
}

/**
 * Approve an affiliate request
 * Creates user account, profile, and affiliate record
 * Requires super admin authentication
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json(createErrorResponse('Method Not Allowed', 'METHOD_NOT_ALLOWED'))
  }

  try {
    // Authenticate and get admin context with audit logging
    const { adminClient, auditLog } = await requireSuperAdminWithAudit(req, res)

    const { request_id } = req.body

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

    // Fetch request
    const { data: request, error: fetchError } = await adminClient
      .from('affiliate_requests')
      .select('*')
      .eq('id', request_id)
      .single()

    if (fetchError || !request) {
      logger.warn('Affiliate request not found for approval', {
        request_id,
        error: fetchError?.message
      })
      return res.status(404).json(createErrorResponse(
        'Solicitud no encontrada',
        'NOT_FOUND',
        { request_id }
      ))
    }

    // Validate request status
    if (request.status !== 'pending_approval') {
      return res.status(400).json(createErrorResponse(
        `La solicitud no puede ser aprobada. Estado actual: ${request.status}`,
        'INVALID_STATUS',
        { currentStatus: request.status, requiredStatus: 'pending_approval' }
      ))
    }

    // Validate terms accepted
    if (!request.terms_accepted) {
      return res.status(400).json(createErrorResponse(
        'La solicitud no tiene términos aceptados',
        'TERMS_NOT_ACCEPTED'
      ))
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!request.email || !emailRegex.test(request.email)) {
      return res.status(400).json(createValidationErrorResponse({
        email: 'Email inválido en la solicitud'
      }))
    }

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://humanosisu.net').replace(/\/$/, '')
    const redirectTo = `${siteUrl}/auth/update-password?next=${encodeURIComponent('/app/login')}`

    const { data: authData, error: authError } = await adminClient.auth.admin.inviteUserByEmail(
      request.email,
      {
        data: {
          full_name: request.questionnaire_data?.full_name || request.email.split('@')[0],
          affiliate_request_id: request.id
        },
        redirectTo
      }
    )

    if (authError || !authData?.user) {
      if (isAuthDuplicateUserError(authError)) {
        return res.status(409).json(
          createErrorResponse('Ya existe un usuario con este correo', 'EMAIL_EXISTS', {
            email: request.email
          })
        )
      }
      logger.error('Error inviting auth user for affiliate approval', {
        request_id,
        email: request.email,
        error: authError?.message || String(authError)
      })
      return res.status(500).json(
        createErrorResponse(
          'Error enviando invitación de autenticación',
          'AUTH_INVITE_FAILED',
          { details: authError?.message }
        )
      )
    }

    const userId = authData.user.id

    // Create user profile
    const { error: profileError } = await adminClient
      .from('user_profiles')
      .insert({
        id: userId,
        email: request.email,
        role: 'affiliate',
        is_b2c: true
      })

    if (profileError) {
      // Rollback: delete auth user
      try {
        await adminClient.auth.admin.deleteUser(userId)
      } catch (deleteError) {
        logger.error('Error deleting auth user during rollback', {
          userId,
          error: deleteError
        })
      }
      logger.error('Error creating user profile for affiliate approval', {
        request_id,
        userId,
        error: profileError?.message || String(profileError)
      })
      return res.status(500).json(createErrorResponse(
        'Error creando perfil de usuario',
        'PROFILE_CREATION_FAILED',
        { details: profileError?.message }
      ))
    }

    // Generate unique referral code
    let referralCode: string | null = null
    let affiliateError: any = null
    let attempts = 0
    const maxAttempts = 10

    do {
      referralCode = randomBytes(4).toString('hex')
      const { error } = await adminClient
        .from('affiliates')
        .insert({
          user_id: userId,
          referral_code: referralCode,
          status: 'approved',
          affiliate_request_id: request.id
        })

      affiliateError = error
      attempts++

      if (!affiliateError) break

      if (affiliateError.code !== '23505') { // Not unique violation
        // Rollback: delete profile and user
        try {
          await adminClient.from('user_profiles').delete().eq('id', userId)
          await adminClient.auth.admin.deleteUser(userId)
        } catch (rollbackError) {
          logger.error('Error during rollback after affiliate creation failure', {
            userId,
            error: rollbackError
          })
        }
        logger.error('Error creating affiliate (non-unique error)', {
          request_id,
          userId,
          error: affiliateError?.message || String(affiliateError)
        })
        throw affiliateError
      }
    } while (attempts < maxAttempts)

    if (affiliateError || !referralCode) {
      // Rollback: delete profile and user
      try {
        await adminClient.from('user_profiles').delete().eq('id', userId)
        await adminClient.auth.admin.deleteUser(userId)
      } catch (rollbackError) {
        logger.error('Error during rollback after max attempts', {
          userId,
          error: rollbackError
        })
      }
      logger.error('Failed to generate unique referral code after max attempts', {
        request_id,
        userId,
        attempts
      })
      return res.status(500).json(createErrorResponse(
        'Error creando registro de afiliado: no se pudo generar código único',
        'REFERRAL_CODE_GENERATION_FAILED'
      ))
    }

    // Get the newly created affiliate_id
    const { data: affiliate, error: affiliateFetchError } = await adminClient
      .from('affiliates')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (affiliateFetchError || !affiliate) {
      logger.error('Error fetching created affiliate', {
        request_id,
        userId,
        error: affiliateFetchError?.message
      })
      // Continue - affiliate was created, just couldn't fetch it
    }

    // Update affiliate_request with user_id and affiliate_id
    const { error: updateError } = await adminClient
      .from('affiliate_requests')
      .update({
        user_id: userId,
        affiliate_id: affiliate?.id,
        status: 'approved',
        updated_at: new Date().toISOString()
      })
      .eq('id', request.id)

    if (updateError) {
      logger.warn('Error updating affiliate_request (non-critical)', {
        request_id,
        error: updateError?.message
      })
      // Don't fail here - user and affiliate were created successfully
    }

    try {
      const loginBase = process.env.NEXT_PUBLIC_SITE_URL || 'https://humanosisu.net'
      await sendAffiliateWelcomeEmail({
        to: request.email,
        email: request.email,
        referralCode: referralCode,
        loginUrl: `${loginBase.replace(/\/$/, '')}/app/login`
      })
      logger.info('Affiliate welcome email sent', {
        request_id,
        email: request.email
      })
    } catch (emailError: any) {
      logger.warn('Error sending affiliate credentials email (non-critical)', {
        request_id,
        email: request.email,
        error: emailError?.message || String(emailError)
      })
      // Don't fail the request if email fails
    }

    // Audit log
    try {
      await auditLog('affiliate_request_approved', {
        request_id,
        affiliate_id: affiliate?.id,
        user_id: userId,
        email: request.email,
        referral_code: referralCode
      })
    } catch (auditError: any) {
      logger.warn('Error logging audit (continuing)', {
        error: auditError?.message || String(auditError)
      })
    }

    return res.status(200).json(createSuccessResponse({
      message:
        'Solicitud aprobada. Se envió invitación para definir contraseña (correo de Supabase) y un resumen del programa.',
      affiliate_id: affiliate?.id,
      user_id: userId,
      referral_code: referralCode
    }))
  } catch (error: any) {
    // Handle auth errors (already sent response)
    if (error.message === 'UNAUTHORIZED' || error.message === 'INSUFFICIENT_PERMISSIONS') {
      return // Response already sent by guard
    }

    logger.error('Unexpected error approving affiliate request', {
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

