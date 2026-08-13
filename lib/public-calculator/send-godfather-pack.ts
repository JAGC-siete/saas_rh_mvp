import { createAdminClient } from '../supabase/server'
import { logger } from '../logger'
import { maskEmail } from '../privacy'
import { getResendFromContact, getResendContactEmail } from '../resend-from'
import { generateGodfatherComparisonPdf } from './godfather-pdf'
import { PUBLIC_CALCULATOR_CONFIGS } from './config'
import { wrapLiquidEmail, liquidParagraph } from '../emails/liquid-layout'

export type SendGodfatherPackResult =
  | { sent: true; messageId?: string }
  | { sent: false; reason: 'already_sent' | 'not_pending' | 'not_found' | 'send_failed' | 'no_api_key' }

function buildGodfatherEmailHtml(keyword: string): string {
  const bodyHtml = [
    liquidParagraph('Aquí va la comparativa de una página que pediste.'),
    liquidParagraph(
      'Puedes dejarla "olvidada" en la impresora de tu oficina o enviársela a tu jefe. Tú no pides nada — solo estás ayudando a la empresa a ser más rentable.'
    ),
    liquidParagraph(`<strong>P.D.</strong> Gracias por responder "${keyword}".`),
  ].join('')

  return wrapLiquidEmail({
    title: 'Tu comparativa Excel vs SISU',
    subtitle: 'Para compartir sin drama',
    badge: 'Secreto',
    bodyHtml,
  })
}

export async function sendGodfatherPackToLead(email: string): Promise<SendGodfatherPackResult> {
  const normalized = email.trim().toLowerCase()
  const supabase = createAdminClient()

  const { data: lead, error: fetchError } = await (supabase as any)
    .from('leads_public_tools')
    .select('id, email, godfather_pending, godfather_sent_at')
    .eq('email', normalized)
    .maybeSingle()

  if (fetchError) {
    logger.error('Godfather pack: fetch lead failed', { email: maskEmail(normalized), error: fetchError.message })
    return { sent: false, reason: 'not_found' }
  }

  if (!lead) {
    return { sent: false, reason: 'not_found' }
  }

  if (lead.godfather_sent_at) {
    return { sent: false, reason: 'already_sent' }
  }

  if (!lead.godfather_pending) {
    return { sent: false, reason: 'not_pending' }
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    logger.error('Godfather pack: RESEND_API_KEY missing')
    return { sent: false, reason: 'no_api_key' }
  }

  const keyword =
    PUBLIC_CALCULATOR_CONFIGS.HND.b2bFunnel?.godfatherKeyword ?? 'MI CONSTANCIA TARDA UNA ETERNIDAD'
  const pdfBuffer = await generateGodfatherComparisonPdf()
  const html = buildGodfatherEmailHtml(keyword)

  const { Resend } = await import('resend')
  const resend = new Resend(apiKey)
  const fromEmail = getResendFromContact()
  const replyTo = getResendContactEmail()

  const result = await resend.emails.send({
    from: fromEmail,
    to: normalized,
    replyTo,
    subject: 'Tu comparativa para el jefe (1 página) — Humano SISU',
    html,
    attachments: [
      {
        filename: 'comparativa-excel-vs-sisu-honduras.pdf',
        content: pdfBuffer.toString('base64'),
      },
    ],
  })

  if ((result as { error?: { message?: string } }).error) {
    logger.error('Godfather pack: Resend failed', {
      email: maskEmail(normalized),
      error: (result as { error?: { message?: string } }).error?.message,
    })
    return { sent: false, reason: 'send_failed' }
  }

  const now = new Date().toISOString()
  await (supabase as any)
    .from('leads_public_tools')
    .update({
      godfather_sent_at: now,
      godfather_pending: false,
      last_seen_at: now,
    })
    .eq('id', lead.id)

  logger.info('Godfather pack sent', {
    email: maskEmail(normalized),
    messageId: (result as { data?: { id?: string } }).data?.id,
  })

  return { sent: true, messageId: (result as { data?: { id?: string } }).data?.id }
}
