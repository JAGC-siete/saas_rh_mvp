import { NextApiRequest, NextApiResponse } from 'next'
import { withRateLimit } from '../../../lib/deduction-validator/rate-limit-wrapper'
import { RATE_LIMITS } from '../../../lib/rate-limit'
import { logger } from '../../../lib/logger'
import { validateEmail } from '../../../lib/deduction-validator/validation'
import { notificationManager } from '../../../lib/notification-providers'
import { getResendFromContact } from '../../../lib/resend-from'
import { createAdminClient } from '../../../lib/supabase/server'
import { maskEmail, normalizeSoftPhone } from '../../../lib/privacy'
import { enrollPublicToolLeadNonBlocking } from '../../../lib/marketing/enroll-public-tool-lead'
import {
  leadSourceForBenefitCalculator,
  marketingSourceForBenefitCalculator,
} from '../../../lib/marketing/benefit-calculator-source'
import { generateBenefitReportPDF } from '../../../lib/benefit-public/pdf-report'
import {
  generateBenefitEmailHTML,
  generateBenefitEmailSubject,
} from '../../../lib/benefit-public/email-template'
import type { BenefitCalculationResult } from '../../../lib/payroll/thirteenth-fourteenth/calculate'
import type { BenefitTipo } from '../../../lib/public-calculator/benefit-config'
import {
  parseMetaTrackingPayload,
  sendMetaWebsiteConversionFireAndForget,
} from '../../../lib/analytics/metaCapiServer'

interface SendBenefitReportRequest extends BenefitCalculationResult {
  email: string
  fullName?: string
  company?: string
  phone?: string
  consentNewsletter?: boolean
  fechaIngreso: string
  label: string
  audience?: 'empleado' | 'empresa'
}

async function sendEmailWithResend(
  email: string,
  subject: string,
  html: string,
  pdfBuffer: Buffer,
  filename: string,
  apiKey: string,
  fromEmail: string
) {
  const { Resend } = await import('resend')
  const resend = new Resend(apiKey)
  return resend.emails.send({
    from: fromEmail,
    to: email,
    subject,
    html,
    attachments: [{ filename, content: pdfBuffer.toString('base64') }],
  })
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  const startTime = Date.now()

  try {
    const body: SendBenefitReportRequest = req.body
    const emailValidation = validateEmail(body.email)

    if (!emailValidation.valid) {
      return res.status(400).json({
        error: emailValidation.error || 'El email proporcionado no es válido',
      })
    }

    const sanitizedEmail = emailValidation.sanitized as string
    const consent = body.consentNewsletter === true
    const name = typeof body.fullName === 'string' ? body.fullName.trim() : ''

    if (!consent) {
      return res.status(400).json({
        error: 'Debes aceptar la suscripción para recibir el cálculo en PDF.',
      })
    }
    if (!name) {
      return res.status(400).json({ error: 'Ingresa tu nombre para enviarte el PDF.' })
    }
    if (!body.tipo || !body.monto) {
      return res.status(400).json({ error: 'Faltan datos del cálculo.' })
    }

    const tipo = body.tipo as BenefitTipo
    const leadSource = leadSourceForBenefitCalculator(tipo)
    const audience =
      body.audience === 'empresa' || body.audience === 'empleado' ? body.audience : null

    try {
      const supabase = createAdminClient()
      const phoneNorm = normalizeSoftPhone(body.phone)
      await (supabase as any).from('leads_public_tools').upsert(
        {
          email: sanitizedEmail,
          full_name: name,
          company: typeof body.company === 'string' ? body.company.trim() || null : null,
          phone: phoneNorm,
          source: leadSource,
          calc_audience: audience,
          consent_newsletter: true,
          consented_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: 'email' }
      )
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown'
      logger.warn('No se pudo guardar lead (beneficio)', { email: maskEmail(sanitizedEmail), error: message })
    }

    if (audience === 'empresa') {
      logger.info('Lead B2B prioritaria — calculadora beneficio', {
        email: maskEmail(sanitizedEmail),
        source: leadSource,
        company: typeof body.company === 'string' ? body.company.trim() || null : null,
      })
    }

    const pdfBuffer = await generateBenefitReportPDF({
      ...body,
      label: body.label,
      fechaIngreso: body.fechaIngreso,
    })

    const html = generateBenefitEmailHTML({ ...body, label: body.label, audience: audience ?? undefined })
    const subject = generateBenefitEmailSubject(body.label)
    const filename = `${leadSource}-humano-sisu.pdf`

    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      return res.status(503).json({ error: 'Servicio de email no configurado' })
    }

    const fromEmail = getResendFromContact()
    await sendEmailWithResend(sanitizedEmail, subject, html, pdfBuffer, filename, apiKey, fromEmail)

    enrollPublicToolLeadNonBlocking(sanitizedEmail, marketingSourceForBenefitCalculator(tipo))

    const metaTracking = parseMetaTrackingPayload(req.body)
    sendMetaWebsiteConversionFireAndForget({
      req,
      eventName: 'CompleteRegistration',
      tracking: metaTracking,
      userData: {
        email: sanitizedEmail,
        phone: typeof body.phone === 'string' ? body.phone : undefined,
        firstName: name || undefined,
      },
      customData: {
        content_name: marketingSourceForBenefitCalculator(tipo),
        content_category: 'calculator',
        value: 1,
        currency: 'USD',
        status: true,
      },
    })

    logger.info('Reporte de beneficio enviado', {
      email: maskEmail(sanitizedEmail),
      tipo,
      duration: Date.now() - startTime,
    })

    return res.status(200).json({ success: true, message: 'Reporte enviado correctamente' })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Error enviando reporte de beneficio', { error: message })
    return res.status(500).json({ error: 'Error al enviar el reporte por email' })
  }
}

export default withRateLimit(RATE_LIMITS.PUBLIC_CALCULATOR, handler)
