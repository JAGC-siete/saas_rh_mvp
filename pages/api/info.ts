import { NextApiRequest, NextApiResponse } from 'next'
import { createSuccessResponse, createErrorResponse } from '../../lib/security/api-responses'
import { logger } from '../../lib/logger'
import { enrollMarketingLead } from '../../lib/marketing/enroll-lead'
import { sendLeadRegistroNotification } from '../../lib/leads/registro-notification'
import { normalizeSoftPhone } from '../../lib/privacy'
import {
  parseMetaTrackingPayload,
  sendMetaWebsiteConversionFireAndForget,
} from '../../lib/analytics/metaCapiServer'
import { validateLeadEmail } from '../../lib/marketing/validate-lead-email'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json(createErrorResponse('Method Not Allowed', 'METHOD_NOT_ALLOWED'))
  }

  try {
    const { nombre, email, phone, empresa, from } = req.body

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

    let phoneNorm: string | null = null
    if (typeof phone === 'string' && phone.trim()) {
      phoneNorm = normalizeSoftPhone(phone.trim())
      if (!phoneNorm) {
        return res.status(400).json(
          createErrorResponse(
            'Número de teléfono inválido. Incluye el código de país y al menos 7 dígitos.',
            'VALIDATION_ERROR'
          )
        )
      }
    }

    const fromViernes = from === 'viernes'
    const leadSource = fromViernes ? 'viernes' : 'info'

    const { leadId, welcomeSent, infoPackSent, skippedReason } = await enrollMarketingLead({
      email: trimmedEmail,
      source: leadSource,
      fullName: trimmedName,
      phone: phoneNorm,
    })

    if (skippedReason !== 'excluded') {
      void sendLeadRegistroNotification({
        source: fromViernes ? 'viernes' : 'info',
        nombre: trimmedName,
        email: trimmedEmail,
        whatsapp: phoneNorm,
        empresa: typeof empresa === 'string' ? empresa.trim() || undefined : undefined,
      })
    }

    if (skippedReason === 'completed') {
      return res.status(200).json(
        createSuccessResponse({
          message: 'La información ya ha sido enviada a este correo electrónico. Por favor, revisa tu bandeja de entrada buscando al remitente: jorgearturo@humanosisu.net',
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
        phone: phoneNorm || undefined,
        firstName: trimmedName,
      },
      customData: {
        content_name: leadSource,
        content_category: 'tofu',
        value: 0,
        currency: 'USD',
        status: true,
      },
    })

    const successMessage = fromViernes
      ? infoPackSent || welcomeSent
        ? 'Gracias. Revisa tu correo: te enviamos las claves para recuperar el viernes.'
        : 'Gracias. Pronto nos pondremos en contacto.'
      : infoPackSent || welcomeSent
        ? 'Gracias. Revisa tu correo: te enviamos la información general sobre SISU.'
        : 'Gracias. Pronto nos pondremos en contacto.'

    return res.status(200).json(
      createSuccessResponse({
        message: successMessage,
        leadId,
      })
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Unexpected error in info lead capture', { error: message })
    return res.status(500).json(createErrorResponse('Internal server error', 'INTERNAL_ERROR'))
  }
}
