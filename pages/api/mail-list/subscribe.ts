import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../lib/supabase/server'
import { randomBytes } from 'crypto'
import { withRateLimit } from '../../../lib/security/rate-limiting'
import { sendMailListConfirmationEmail } from '../../../lib/emails/mail-list-confirmation'
import { createSuccessResponse, createErrorResponse, createValidationErrorResponse } from '../../../lib/security/api-responses'
import { logger } from '../../../lib/logger'

export default withRateLimit('general')(handler)

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json(createErrorResponse('Method Not Allowed', 'METHOD_NOT_ALLOWED'))
  }

  const { email, source } = req.body

  // Validación estricta de email
  if (!email || typeof email !== 'string') {
    return res.status(400).json(createValidationErrorResponse({ 
      email: 'El email es requerido.' 
    }))
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const normalizedEmail = email.trim().toLowerCase()

  if (!emailRegex.test(normalizedEmail)) {
    return res.status(400).json(createValidationErrorResponse({ 
      email: 'Formato de email inválido.' 
    }))
  }

  // Validar longitud
  if (normalizedEmail.length > 255 || normalizedEmail.length < 3) {
    return res.status(400).json(createValidationErrorResponse({ 
      email: 'El email debe tener entre 3 y 255 caracteres.' 
    }))
  }

  // Usar cliente anónimo - RLS hará el enforcement
  const supabase = createClient(req, res)

  try {
    // Generar token único
    let confirmationToken: string
    let attempts = 0
    const maxAttempts = 10

    do {
      confirmationToken = randomBytes(16).toString('hex')
      attempts++

      // Verificar que el token no existe (muy poco probable pero por seguridad)
      const { data: tokenExists } = await supabase
        .from('mail_list_subscriptions')
        .select('id')
        .eq('confirmation_token', confirmationToken)
        .maybeSingle()

      if (!tokenExists) break
    } while (attempts < maxAttempts)

    if (attempts >= maxAttempts) {
      logger.error('Failed to generate unique confirmation token after multiple attempts')
      return res.status(500).json(createErrorResponse(
        'Error interno del servidor.',
        'TOKEN_GENERATION_FAILED'
      ))
    }

    // Intentar insertar nuevo registro
    // RLS policy permitirá INSERT solo con email válido y token
    const { data: newSubscription, error: insertError } = await supabase
      .from('mail_list_subscriptions')
      .insert({
        email: normalizedEmail,
        confirmation_token: confirmationToken,
        status: 'pending',
        source: source || 'landing',
      })
      .select('id, status')
      .single()

    // Si hay error de duplicado o ya existe, tratar de actualizar
    if (insertError) {
      if (insertError.code === '23505') {
        // Duplicado - intentar actualizar con nuevo token
        const { data: existing, error: updateError } = await supabase
          .from('mail_list_subscriptions')
          .update({
            confirmation_token: confirmationToken,
            status: 'pending',
            source: source || 'landing',
            updated_at: new Date().toISOString()
          })
          .eq('email', normalizedEmail)
          .select('id, status')
          .single()

        if (updateError) {
          // Si ya está confirmado o hay otro error, retornar éxito (no exponer estado)
          logger.debug('Subscription update failed, returning success for security', {
            email: normalizedEmail,
            error: updateError.message
          })
        } else if (existing && existing.status === 'confirmed') {
          // Ya confirmado - retornar éxito sin exponer
          logger.debug('Subscription already confirmed, returning success', {
            email: normalizedEmail
          })
        }
      } else {
        logger.error('Error creating mail list subscription', {
          email: normalizedEmail,
          error: insertError.message,
          code: insertError.code
        })
        // Retornar éxito genérico por seguridad
      }
    } else if (newSubscription) {
      logger.info('Mail list subscription created', {
        subscriptionId: newSubscription.id,
        email: normalizedEmail,
        source: source || 'landing'
      })
    }

    // Enviar email de confirmación
    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://humanosisu.net'
      const confirmUrl = `${siteUrl}/api/mail-list/confirm?token=${confirmationToken}`
      
      // Verificar que RESEND_API_KEY esté configurado antes de intentar enviar
      if (!process.env.RESEND_API_KEY) {
        logger.warn('RESEND_API_KEY not configured - confirmation email will not be sent', {
          email: normalizedEmail
        })
        // Continuar sin fallar la request
      } else {
        await sendMailListConfirmationEmail({
          to: normalizedEmail,
          confirmUrl,
        })
        logger.info('Confirmation email sent', {
          email: normalizedEmail
        })
      }
    } catch (emailError: any) {
      logger.error('Error sending confirmation email', {
        error: emailError?.message || emailError,
        errorCode: emailError?.errorCode,
        email: normalizedEmail
      })
      // No fallar la request si el email falla, pero loguear detalladamente
    }

    // Retornar éxito siempre (por seguridad, no exponer si email existe)
    return res.status(200).json(createSuccessResponse({
      message: 'Gracias por tu interés. Revisa tu correo para confirmar tu suscripción.'
    }))
  } catch (error: any) {
    logger.error('Unexpected error in mail list subscription', {
      error: error?.message || error,
      stack: error?.stack,
      email: email,
      source: source
    })
    return res.status(500).json(createErrorResponse(
      'Error procesando tu solicitud.',
      'INTERNAL_ERROR'
    ))
  }
}

