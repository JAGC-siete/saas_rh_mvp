/**
 * Captura pública de /webycitas. Sin sesión. Insert en webycitas_leads y, si
 * el puente funciona, una landing_pages is_lead_preview servida en /p/[slug].
 * No crea tenant de planilla. JSON de plantilla se regenera en servidor.
 *
 * Seguridad: rate limit por IP, honeypot, tope de body y ráfaga global.
 */

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
  demoLocalFieldErrors,
  DEMO_LOCAL_MARKETING_SOURCE,
  formatDemoLocalServices,
  looksLikeDemoLocalBot,
  parseDemoLocalLead,
  rubroLabel,
  WEBYCITAS_LEAD_SOURCE,
  WEBYCITAS_LEADS_TABLE,
} from '../../../lib/marketing/demo-local'
import { formatDateTimeForHonduras } from '../../../lib/timezone'
import {
  parseMetaTrackingPayload,
  sendMetaWebsiteConversionFireAndForget,
} from '../../../lib/analytics/metaCapiServer'
import { SEO_BASE_URL } from '../../../lib/seo/assets'
import { ensureLandingStudioCompanyId } from '../../../lib/landings/studio-company'
import { publishWebycitasPreview } from '../../../lib/marketing/webycitas-publish'

const MAX_BODY_BYTES = 8 * 1024
const BURST_WINDOW_MS = 60 * 1000
const BURST_MAX = 8

type Supabase = ReturnType<typeof createAdminClient>

async function hasRecentBurst(supabase: Supabase): Promise<boolean> {
  const since = new Date(Date.now() - BURST_WINDOW_MS).toISOString()
  const { count, error } = await supabase
    .from(WEBYCITAS_LEADS_TABLE)
    .select('id', { count: 'exact', head: true })
    .gte('created_at', since)

  if (error) {
    logger.warn('No se pudo verificar ráfaga webycitas', { error: error.message })
    return false
  }

  return (count ?? 0) >= BURST_MAX
}

async function sendResendEmail(params: {
  from: string
  to: string
  replyTo?: string
  subject: string
  html: string
}): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { ok: false, error: 'RESEND_API_KEY ausente' }

  const { Resend } = await import('resend')
  const resend = new Resend(apiKey)
  const sent = await resend.emails.send({
    from: params.from,
    to: params.to,
    replyTo: params.replyTo,
    subject: params.subject,
    html: params.html,
  })

  return sent.error ? { ok: false, error: sent.error.message } : { ok: true }
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ success: false, error: 'Método no permitido' })
  }

  const contentLength = Number(req.headers['content-length'] ?? 0)
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return res.status(413).json({ success: false, error: 'Solicitud demasiado grande' })
  }

  const started = Date.now()
  const parsed = parseDemoLocalLead(req.body)
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message || 'Parámetros inválidos'
    logger.warn('Validación fallida en lead webycitas', {
      source: WEBYCITAS_LEAD_SOURCE,
      error: first,
    })
    return res.status(400).json({
      success: false,
      error: first,
      fields: demoLocalFieldErrors(parsed.error),
    })
  }

  const lead = parsed.data

  if (looksLikeDemoLocalBot(lead)) {
    logger.info('Lead webycitas descartado por honeypot')
    return res.status(200).json({ success: true })
  }

  let supabase: Supabase
  try {
    supabase = createAdminClient()
  } catch (err: unknown) {
    logger.error('Cliente admin no disponible para webycitas', {
      error: err instanceof Error ? err.message : 'Unknown',
    })
    return res.status(503).json({ success: false, error: 'No se pudo registrar la solicitud' })
  }

  const receivedAt = new Date()

  if (await hasRecentBurst(supabase)) {
    logger.warn('Ráfaga de leads webycitas')
    return res.status(429).json({ success: false, error: 'Demasiados envíos. Intenta en unos minutos.' })
  }

  let leadId: string
  try {
    const { data, error } = await supabase
      .from(WEBYCITAS_LEADS_TABLE)
      .insert({
        owner_name: lead.ownerName,
        business_name: lead.businessName,
        email: lead.email,
        phone: normalizeSoftPhone(lead.phone),
        rubro: lead.rubro,
        city: lead.city,
        note: lead.note ?? null,
        services: [...lead.services],
        status: 'received',
        source: WEBYCITAS_LEAD_SOURCE,
        consented_at: receivedAt.toISOString(),
      })
      .select('id')
      .single()

    if (error) throw new Error(error.message)
    leadId = (data as { id: string }).id
  } catch (err: unknown) {
    logger.error('No se pudo guardar lead webycitas', {
      email: maskEmail(lead.email),
      error: err instanceof Error ? err.message : 'Unknown',
    })
    return res.status(500).json({ success: false, error: 'No se pudo registrar la solicitud' })
  }

  let publicPath: string | undefined
  try {
    const companyId = await ensureLandingStudioCompanyId(supabase as never)
    const preview = await publishWebycitasPreview({
      adminClient: supabase,
      companyId,
      leadId,
      lead,
    })
    if (preview) publicPath = preview.publicPath
  } catch (err: unknown) {
    logger.error('No se pudo publicar maqueta webycitas', {
      leadId,
      error: err instanceof Error ? err.message : 'Unknown',
    })
  }

  const publicUrl = publicPath ? `${SEO_BASE_URL}${publicPath}` : undefined
  const fromEmail = getResendFromContact()
  const replyTo = getResendContactEmail()
  const ownerMail = buildDemoLocalOwnerEmail(lead, publicUrl ? { publicUrl } : undefined)

  try {
    const sent = await sendResendEmail({
      from: fromEmail,
      to: lead.email,
      replyTo,
      subject: ownerMail.subject,
      html: ownerMail.html,
    })
    if (!sent.ok) {
      logger.error('Resend rechazó correo webycitas al dueño', {
        leadId,
        email: maskEmail(lead.email),
        error: sent.error,
      })
    }
  } catch (error: unknown) {
    logger.error('Error enviando correo webycitas al dueño', {
      leadId,
      email: maskEmail(lead.email),
      error: error instanceof Error ? error.message : 'Unknown',
    })
  }

  const internalMail = buildDemoLocalInternalEmail(lead, receivedAt, publicUrl ? { publicUrl } : undefined)
  try {
    const notify = await sendResendEmail({
      from: fromEmail,
      to: replyTo,
      subject: internalMail.subject,
      html: internalMail.html,
    })
    if (notify.ok) {
      await supabase
        .from(WEBYCITAS_LEADS_TABLE)
        .update({ notified_at: new Date().toISOString() })
        .eq('id', leadId)
    } else {
      logger.warn('Aviso interno webycitas no enviado', {
        leadId,
        error: notify.error,
      })
    }
  } catch (error: unknown) {
    logger.warn('Aviso interno webycitas falló (no bloquea)', {
      leadId,
      error: error instanceof Error ? error.message : 'Unknown',
    })
  }

  sendMetaWebsiteConversionFireAndForget({
    req,
    eventName: 'Lead',
    tracking: parseMetaTrackingPayload(req.body),
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

  logger.info('Lead webycitas capturado', {
    leadId,
    email: maskEmail(lead.email),
    rubro: rubroLabel(lead.rubro),
    services: formatDemoLocalServices(lead.services),
    publicPath: publicPath ?? null,
    receivedAtHn: formatDateTimeForHonduras(receivedAt),
    duration: Date.now() - started,
  })

  return res.status(200).json({ success: true, publicPath: publicPath ?? null })
}

export default withRateLimit(RATE_LIMITS.PUBLIC_LANDING_LEAD, handler)
