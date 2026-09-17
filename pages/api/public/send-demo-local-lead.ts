import type { NextApiRequest, NextApiResponse } from 'next'
import { withRateLimit } from '../../../lib/deduction-validator/rate-limit-wrapper'
import { RATE_LIMITS } from '../../../lib/rate-limit'
import { logger } from '../../../lib/logger'
import { getResendContactEmail, getResendFromContact } from '../../../lib/resend-from'
import { createAdminClient } from '../../../lib/supabase/server'
import { maskEmail, normalizeSoftPhone } from '../../../lib/privacy'
import {
  buildDemoLocalInternalEmail,
  buildDemoLocalOwnerEmail,
  DEMO_LOCAL_LEAD_SOURCE,
  DEMO_LOCAL_MARKETING_SOURCE,
  parseDemoLocalLead,
  rubroLabel,
} from '../../../lib/marketing/demo-local'
import { formatDateTimeForHonduras, getHondurasTimeISO } from '../../../lib/timezone'
import {
  parseMetaTrackingPayload,
  sendMetaWebsiteConversionFireAndForget,
} from '../../../lib/analytics/metaCapiServer'

async function sendResendEmail(params: {
  apiKey: string
  from: string
  to: string
  replyTo?: string
  subject: string
  html: string
}) {
  const { Resend } = await import('resend')
  const resend = new Resend(params.apiKey)
  return resend.emails.send({
    from: params.from,
    to: params.to,
    replyTo: params.replyTo,
    subject: params.subject,
    html: params.html,
  })
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  const started = Date.now()
  const parsed = parseDemoLocalLead(req.body)
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message || 'Parámetros inválidos'
    logger.warn('Validación fallida en lead demo-local', {
      source: DEMO_LOCAL_LEAD_SOURCE,
      error: first,
    })
    return res.status(400).json({ error: first })
  }

  const lead = parsed.data
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return res.status(503).json({ error: 'Servicio de email no configurado' })
  }

  const receivedAt = new Date()
  const consentedAt = getHondurasTimeISO()
  const phoneNorm = normalizeSoftPhone(lead.phone)

  try {
    const supabase = createAdminClient()
    await (supabase as any).from('leads_public_tools').upsert(
      {
        email: lead.email,
        full_name: lead.ownerName,
        company: lead.businessName,
        phone: phoneNorm,
        source: DEMO_LOCAL_LEAD_SOURCE,
        consent_newsletter: true,
        consented_at: consentedAt,
        last_seen_at: consentedAt,
      },
      { onConflict: 'email' }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown'
    logger.warn('No se pudo guardar lead (demo-local)', {
      email: maskEmail(lead.email),
      error: message,
    })
  }

  const fromEmail = getResendFromContact()
  const replyTo = getResendContactEmail()
  const ownerMail = buildDemoLocalOwnerEmail(lead)

  try {
    const sent = await sendResendEmail({
      apiKey,
      from: fromEmail,
      to: lead.email,
      replyTo,
      subject: ownerMail.subject,
      html: ownerMail.html,
    })
    if (sent.error) {
      logger.error('Resend rechazó correo demo-local al dueño', {
        email: maskEmail(lead.email),
        error: sent.error.message,
      })
      return res.status(502).json({ error: 'No se pudo enviar el correo de confirmación' })
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Error enviando correo demo-local al dueño', {
      email: maskEmail(lead.email),
      error: message,
    })
    return res.status(500).json({ error: 'Error al enviar el correo' })
  }

  const internalMail = buildDemoLocalInternalEmail(lead, receivedAt)
  try {
    const notify = await sendResendEmail({
      apiKey,
      from: fromEmail,
      to: replyTo,
      subject: internalMail.subject,
      html: internalMail.html,
    })
    if (notify.error) {
      logger.warn('Aviso interno demo-local no enviado', { error: notify.error.message })
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown'
    logger.warn('Aviso interno demo-local falló (no bloquea)', { error: message })
  }

  try {
    const { enrollPublicToolLeadNonBlocking } = await import(
      '../../../lib/marketing/enroll-public-tool-lead'
    )
    enrollPublicToolLeadNonBlocking(lead.email, DEMO_LOCAL_MARKETING_SOURCE)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown'
    logger.warn('Marketing enroll omitido en demo-local (non-blocking)', {
      email: maskEmail(lead.email),
      error: message,
    })
  }

  const metaTracking = parseMetaTrackingPayload(req.body)
  sendMetaWebsiteConversionFireAndForget({
    req,
    eventName: 'Lead',
    tracking: metaTracking,
    userData: {
      email: lead.email,
      phone: lead.phone,
      firstName: lead.ownerName,
    },
    customData: {
      content_name: DEMO_LOCAL_MARKETING_SOURCE,
      content_category: 'local-landing',
      value: 1,
      currency: 'USD',
      status: true,
    },
  })

  logger.info('Lead demo-local capturado', {
    email: maskEmail(lead.email),
    rubro: rubroLabel(lead.rubro),
    receivedAtHn: formatDateTimeForHonduras(receivedAt),
    duration: Date.now() - started,
  })

  return res.status(200).json({ success: true })
}

export default withRateLimit(RATE_LIMITS.PUBLIC_EMAIL, handler)
