/**
 * Captura de leads de una landing publicada. Sin sesión: lo consume el visitante anónimo.
 *
 * Seguridad:
 * - El cliente manda `slug` (o `landingId`), nunca company_id. El tenant se resuelve en
 *   servidor, así nadie puede escribir leads en la empresa de otro.
 * - Escribe con service role porque el rol anon no tiene INSERT en landing_leads.
 *   El filtro de tenant es explícito en cada consulta, no implícito por RLS.
 * - Tres frenos de abuso: rate limit por IP, honeypot y ráfaga por página en la base.
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { withRateLimit } from '../../../lib/deduction-validator/rate-limit-wrapper'
import { RATE_LIMITS } from '../../../lib/rate-limit'
import { logger } from '../../../lib/logger'
import { maskEmail, normalizeSoftPhone } from '../../../lib/privacy'
import { getResendFromNoreply, getResendNoreplyEmail } from '../../../lib/resend-from'
import { createAdminClient } from '../../../lib/supabase/server'
import { LANDING_LEADS_TABLE, LANDING_PAGES_TABLE } from '../../../lib/landings/db'
import { buildLandingLeadNotification } from '../../../lib/landings/lead-email'
import {
  LANDING_LEAD_SOURCE,
  landingLeadFieldErrors,
  looksLikeBot,
  parseLandingLead,
  type LandingLead,
} from '../../../lib/landings/lead-schema'

/** Un cuerpo legítimo son unos cientos de bytes; esto corta payloads de relleno. */
const MAX_BODY_BYTES = 8 * 1024

/** Ráfaga por página: protege de spam distribuido que esquiva el límite por IP. */
const BURST_WINDOW_MS = 60 * 1000
const BURST_MAX_LEADS = 10

interface ResolvedLanding {
  id: string
  company_id: string
  title: string
  slug: string
  lead_notify_email: string | null
  created_by: string | null
}

type Supabase = ReturnType<typeof createAdminClient>

async function resolveLanding(
  supabase: Supabase,
  lead: LandingLead
): Promise<ResolvedLanding | null> {
  let query = supabase
    .from(LANDING_PAGES_TABLE)
    .select('id, company_id, title, slug, lead_notify_email, created_by')
    .eq('status', 'published')

  query = lead.landingId ? query.eq('id', lead.landingId) : query.eq('slug', lead.slug as string)

  const { data, error } = await query.maybeSingle()
  if (error) throw new Error(error.message)
  return (data as ResolvedLanding | null) ?? null
}

async function hasRecentBurst(supabase: Supabase, landingId: string): Promise<boolean> {
  const since = new Date(Date.now() - BURST_WINDOW_MS).toISOString()
  const { count, error } = await supabase
    .from(LANDING_LEADS_TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('landing_id', landingId)
    .gte('created_at', since)

  if (error) {
    // Si el conteo falla no se bloquea el lead: el límite por IP sigue activo.
    logger.warn('No se pudo verificar ráfaga de leads', { landingId, error: error.message })
    return false
  }

  return (count ?? 0) >= BURST_MAX_LEADS
}

/**
 * A quién se avisa: el correo configurado en la página y, si no hay, el del admin
 * que la creó. Nunca cae en un buzón nuestro: los leads son del inquilino.
 */
async function resolveNotifyEmail(
  supabase: Supabase,
  landing: ResolvedLanding
): Promise<string | null> {
  if (landing.lead_notify_email) return landing.lead_notify_email
  if (!landing.created_by) return null

  try {
    const { data, error } = await supabase.auth.admin.getUserById(landing.created_by)
    if (error) return null
    return data.user?.email ?? null
  } catch {
    return null
  }
}

async function sendNotification(params: {
  to: string
  subject: string
  html: string
  replyTo?: string
}): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { ok: false, error: 'RESEND_API_KEY ausente' }

  const { Resend } = await import('resend')
  const resend = new Resend(apiKey)
  const sent = await resend.emails.send({
    from: getResendFromNoreply({ displayName: 'Tu página web' }),
    to: params.to,
    replyTo: params.replyTo ?? getResendNoreplyEmail(),
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

  const parsed = parseLandingLead(req.body)
  if (!parsed.success) {
    const fields = landingLeadFieldErrors(parsed.error)
    return res.status(400).json({
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Datos inválidos',
      fields,
    })
  }

  const lead = parsed.data

  // Bot detectado: misma respuesta que un envío correcto, para no enseñarle la regla.
  if (looksLikeBot(lead)) {
    logger.info('Lead de landing descartado por honeypot', { slug: lead.slug ?? null })
    return res.status(200).json({ success: true, message: 'Lead registrado' })
  }

  const supabase = createAdminClient()
  const receivedAt = new Date()

  let landing: ResolvedLanding | null
  try {
    landing = await resolveLanding(supabase, lead)
  } catch (err: unknown) {
    logger.error('Error resolviendo la landing del lead', {
      slug: lead.slug ?? null,
      landingId: lead.landingId ?? null,
      error: err instanceof Error ? err.message : 'Unknown',
    })
    return res.status(500).json({ success: false, error: 'No se pudo procesar la solicitud' })
  }

  if (!landing) {
    return res.status(404).json({ success: false, error: 'Página no encontrada o sin publicar' })
  }

  if (await hasRecentBurst(supabase, landing.id)) {
    logger.warn('Ráfaga de leads en una landing', { landingId: landing.id, slug: landing.slug })
    return res.status(429).json({ success: false, error: 'Demasiados envíos. Intenta en unos minutos.' })
  }

  let leadId: string
  try {
    const { data, error } = await supabase
      .from(LANDING_LEADS_TABLE)
      .insert({
        landing_id: landing.id,
        company_id: landing.company_id,
        full_name: lead.fullName,
        email: lead.email ?? null,
        phone: lead.phone ? normalizeSoftPhone(lead.phone) : null,
        message: lead.message ?? null,
        source: LANDING_LEAD_SOURCE,
        extra: lead.blockId ? { blockId: lead.blockId } : {},
      })
      .select('id')
      .single()

    if (error) throw new Error(error.message)
    leadId = (data as { id: string }).id
  } catch (err: unknown) {
    logger.error('No se pudo guardar el lead de la landing', {
      landingId: landing.id,
      companyId: landing.company_id,
      email: lead.email ? maskEmail(lead.email) : null,
      error: err instanceof Error ? err.message : 'Unknown',
    })
    return res.status(500).json({ success: false, error: 'No se pudo registrar el lead' })
  }

  // El lead ya está guardado: a partir de aquí ningún fallo pierde el dato.
  const notifyEmail = await resolveNotifyEmail(supabase, landing)

  if (!notifyEmail) {
    logger.warn('Lead guardado sin destino de aviso', { landingId: landing.id, leadId })
    return res.status(200).json({ success: true, message: 'Lead registrado' })
  }

  const mail = buildLandingLeadNotification({
    lead,
    landingTitle: landing.title,
    slug: landing.slug,
    receivedAt,
  })

  try {
    const sent = await sendNotification({
      to: notifyEmail,
      subject: mail.subject,
      html: mail.html,
      replyTo: mail.replyTo,
    })

    if (sent.ok) {
      await supabase
        .from(LANDING_LEADS_TABLE)
        .update({ notified_at: new Date().toISOString() })
        .eq('id', leadId)
        .eq('company_id', landing.company_id)
    } else {
      logger.error('Aviso de lead no enviado', {
        landingId: landing.id,
        leadId,
        to: maskEmail(notifyEmail),
        error: sent.error,
      })
    }
  } catch (err: unknown) {
    logger.error('Error enviando el aviso de lead', {
      landingId: landing.id,
      leadId,
      error: err instanceof Error ? err.message : 'Unknown',
    })
  }

  logger.info('Lead de landing capturado', {
    landingId: landing.id,
    companyId: landing.company_id,
    leadId,
    slug: landing.slug,
    email: lead.email ? maskEmail(lead.email) : null,
  })

  return res.status(200).json({ success: true, message: 'Lead registrado' })
}

export default withRateLimit(RATE_LIMITS.PUBLIC_LANDING_LEAD, handler)
