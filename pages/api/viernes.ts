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

const LEAD_SOURCE = 'viernes'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json(createErrorResponse('Method Not Allowed', 'METHOD_NOT_ALLOWED'))
  }

  try {
    const { nombre, email } = req.body

    const trimmedName = typeof nombre === 'string' ? nombre.trim() : ''
    if (!trimmedName) {
      return res.status(400).json(createErrorResponse('El nombre es requerido', 'VALIDATION_ERROR'))
    }
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

    const { leadId, welcomeSent, infoPackSent, skippedReason } = await enrollMarketingLead({
      email: trimmedEmail,
      source: LEAD_SOURCE,
      fullName: trimmedName,
    })

    if (skippedReason !== 'excluded') {
      void sendLeadRegistroNotification({
        source: 'viernes',
        nombre: trimmedName,
        email: trimmedEmail,
      })
    }

    if (skippedReason === 'completed') {
      return res.status(200).json(
        createSuccessResponse({
          message:
            'Las claves ya fueron enviadas a este correo. Revisa tu bandeja buscando a jorgearturo@humanosisu.net',
          leadId,
        })
      )
    }

    if (skippedReason === 'excluded') {
      return res.status(200).json(
        createSuccessResponse({
          message: 'Solicitud registrada.',
          leadId: null,
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
        firstName: trimmedName,
      },
      customData: {
        content_name: 'viernes',
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
            ? 'Gracias. Revisa tu correo: te enviamos las claves para recuperar el viernes.'
            : 'Gracias. Pronto nos pondremos en contacto.',
        leadId,
      })
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Unexpected error in viernes lead capture', { error: message })
    return res.status(500).json(createErrorResponse('Internal server error', 'INTERNAL_ERROR'))
  }
}
