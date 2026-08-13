import { NextApiRequest, NextApiResponse } from 'next'
import { createSuccessResponse, createErrorResponse } from '../../../lib/security/api-responses'
import { logger } from '../../../lib/logger'
import { enrollMarketingLead } from '../../../lib/marketing/enroll-lead'
import { sendLeadRegistroNotification } from '../../../lib/leads/registro-notification'
import {
  parseMetaTrackingPayload,
  sendMetaWebsiteConversionFireAndForget,
} from '../../../lib/analytics/metaCapiServer'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json(createErrorResponse('Method Not Allowed', 'METHOD_NOT_ALLOWED'))
  }

  try {
    const { email, source, nombre } = req.body
    if (!email) return res.status(400).json(createErrorResponse('Email is required', 'VALIDATION_ERROR'))

    const trimmedEmail = email.trim().toLowerCase()
    const leadSource = typeof source === 'string' && source.trim() ? source.trim() : 'suscripcion-page'
    const fullName = typeof nombre === 'string' ? nombre.trim() : undefined

    const { leadId, welcomeSent, skippedReason } = await enrollMarketingLead({
      email: trimmedEmail,
      source: leadSource,
      fullName: fullName || null,
    })

    if (skippedReason !== 'excluded') {
      void sendLeadRegistroNotification({
        source: 'suscripcion',
        nombre: fullName || trimmedEmail.split('@')[0] || 'Suscriptor',
        email: trimmedEmail,
      })
    }

    if (skippedReason === 'excluded') {
      return res.status(200).json(
        createSuccessResponse({
          message: 'Suscripción registrada.',
          leadId: null,
        })
      )
    }

    const metaTracking = parseMetaTrackingPayload(req.body)
    sendMetaWebsiteConversionFireAndForget({
      req,
      eventName: 'CompleteRegistration',
      tracking: metaTracking,
      userData: { email: trimmedEmail },
      customData: {
        content_name: leadSource,
        content_category: 'newsletter',
        value: 0,
        currency: 'USD',
        status: true,
      },
    })

    return res.status(200).json(
      createSuccessResponse({
        message: welcomeSent
          ? 'Suscripción exitosa. Bienvenido a la comunidad.'
          : 'Suscripción exitosa.',
        leadId,
      })
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Unexpected error in lead subscription', { error: message })
    return res.status(500).json(createErrorResponse('Internal server error', 'INTERNAL_ERROR'))
  }
}
