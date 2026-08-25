import { NextApiRequest, NextApiResponse } from 'next'
import { createSuccessResponse, createErrorResponse } from '../../lib/security/api-responses'
import { logger } from '../../lib/logger'
import { enrollMarketingLead } from '../../lib/marketing/enroll-lead'
import { sendLeadRegistroNotification } from '../../lib/leads/registro-notification'
import {
  parseMetaTrackingPayload,
  sendMetaWebsiteConversionFireAndForget,
} from '../../lib/analytics/metaCapiServer'
import { validateLeadEmail } from '../../lib/marketing/validate-lead-email'

const LEAD_SOURCE = 'paz'

function displayNameFromEmail(email: string): string {
  const local = email.split('@')[0]?.trim()
  return local || 'Lead /paz'
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json(createErrorResponse('Method Not Allowed', 'METHOD_NOT_ALLOWED'))
  }

  try {
    const { nombre, email } = req.body

    const trimmedName = typeof nombre === 'string' ? nombre.trim() : ''
    if (trimmedName.length > 120) {
      return res.status(400).json(createErrorResponse('El nombre es demasiado largo', 'VALIDATION_ERROR'))
    }

    if (!email || typeof email !== 'string') {
      return res.status(400).json(createErrorResponse('El email es requerido', 'VALIDATION_ERROR'))
    }

    const emailValidation = validateLeadEmail(email)
    if (!emailValidation.ok) {
      return res.status(400).json(createErrorResponse(emailValidation.message, 'VALIDATION_ERROR'))
    }
    const trimmedEmail = emailValidation.email
    const fullName = trimmedName || displayNameFromEmail(trimmedEmail)

    const { leadId, welcomeSent, infoPackSent, skippedReason } = await enrollMarketingLead({
      email: trimmedEmail,
      source: LEAD_SOURCE,
      fullName: trimmedName || undefined,
    })

    if (skippedReason !== 'excluded') {
      void sendLeadRegistroNotification({
        source: 'paz',
        nombre: fullName,
        email: trimmedEmail,
      })
    }

    if (skippedReason === 'completed') {
      return res.status(200).json(
        createSuccessResponse({
          message:
            'El video ya fue enviado a este correo. Revisa tu bandeja buscando a humanosisu@humanosisu.net',
          leadId,
          unlocked: true,
        })
      )
    }

    if (skippedReason === 'excluded') {
      return res.status(200).json(
        createSuccessResponse({
          message: 'Solicitud registrada.',
          leadId: null,
          unlocked: true,
        })
      )
    }

    const metaTracking = parseMetaTrackingPayload(req.body)
    sendMetaWebsiteConversionFireAndForget({
      req,
      eventName: 'Lead',
      tracking: metaTracking,
      userData: {
        email: trimmedEmail,
        firstName: trimmedName || undefined,
      },
      customData: {
        content_name: 'paz',
        content_category: 'tofu',
        value: 0,
        currency: 'USD',
        status: true,
      },
    })

    return res.status(200).json(
      createSuccessResponse({
        message:
          infoPackSent || welcomeSent
            ? 'Gracias. El video está acá — y el enlace también va a tu correo.'
            : 'Gracias. Pronto nos pondremos en contacto.',
        leadId,
        unlocked: true,
      })
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Unexpected error in paz lead capture', { error: message })
    return res.status(500).json(createErrorResponse('Internal server error', 'INTERNAL_ERROR'))
  }
}
