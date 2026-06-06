import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { createSuccessResponse, createErrorResponse } from '../../../lib/security/api-responses'
import { logger } from '../../../lib/logger'
import {
  getWatchWindowKey,
  SEQUENCE_CONTENT,
  SEQUENCE_STEP,
  WATCHMAN_FIRST_STEP,
} from '../../../lib/marketing/email-sequence-ledger'
import { generateUnsubscribeToken } from '../../../lib/marketing/unsubscribe'
import { sendSequenceEmail } from '../../../lib/marketing/send-sequence-email'
import {
  parseMetaTrackingPayload,
  sendMetaWebsiteConversionFireAndForget,
} from '../../../lib/analytics/metaCapiServer'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type MarketingLeadRow = {
  id: string
  email: string
  status: string
  current_step: number
  unsubscribe_token: string
}

async function hasWelcomeInLedger(leadId: string): Promise<boolean> {
  const { count, error } = await supabaseAdmin
    .from('marketing_email_ledger')
    .select('id', { count: 'exact', head: true })
    .eq('lead_id', leadId)
    .eq('step', SEQUENCE_STEP.WELCOME)

  if (error) {
    logger.warn('Could not check welcome ledger', { leadId, error: error.message })
    return false
  }

  return (count ?? 0) > 0
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json(createErrorResponse('Method Not Allowed', 'METHOD_NOT_ALLOWED'))
  }

  try {
    const { email, source } = req.body
    if (!email) return res.status(400).json(createErrorResponse('Email is required', 'VALIDATION_ERROR'))

    const trimmedEmail = email.trim().toLowerCase()
    const now = new Date()
    const welcomeContent = SEQUENCE_CONTENT[SEQUENCE_STEP.WELCOME]

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('marketing_leads')
      .select('id, email, status, current_step, unsubscribe_token')
      .eq('email', trimmedEmail)
      .maybeSingle()

    if (fetchError) {
      logger.error('Error fetching lead', { email: trimmedEmail, error: fetchError.message })
      return res.status(500).json(createErrorResponse('Database error', 'DATABASE_ERROR'))
    }

    let lead: MarketingLeadRow
    let shouldSendWelcome = false

    if (!existing) {
      const token = generateUnsubscribeToken()
      const { data: inserted, error: insertError } = await supabaseAdmin
        .from('marketing_leads')
        .insert({
          email: trimmedEmail,
          source: source || 'web-subscription',
          status: 'active',
          current_step: SEQUENCE_STEP.WELCOME,
          unsubscribe_token: token,
        })
        .select('id, email, status, current_step, unsubscribe_token')
        .single()

      if (insertError || !inserted) {
        logger.error('Error capturing lead', { email: trimmedEmail, error: insertError?.message })
        return res.status(500).json(createErrorResponse('Database error', 'DATABASE_ERROR'))
      }

      lead = inserted as MarketingLeadRow
      shouldSendWelcome = true
    } else if (existing.status === 'unsubscribed') {
      const { data: reactivated, error: updateError } = await supabaseAdmin
        .from('marketing_leads')
        .update({
          status: 'active',
          source: source || 'web-subscription',
          unsubscribed_at: null,
          current_step: WATCHMAN_FIRST_STEP,
        })
        .eq('id', existing.id)
        .select('id, email, status, current_step, unsubscribe_token')
        .single()

      if (updateError || !reactivated) {
        logger.error('Error reactivating lead', { email: trimmedEmail, error: updateError?.message })
        return res.status(500).json(createErrorResponse('Database error', 'DATABASE_ERROR'))
      }

      lead = reactivated as MarketingLeadRow
      shouldSendWelcome = true
    } else {
      lead = existing as MarketingLeadRow
      if (existing.current_step <= SEQUENCE_STEP.WELCOME) {
        shouldSendWelcome = !(await hasWelcomeInLedger(existing.id))
      }
    }

    if (shouldSendWelcome) {
      try {
        await sendSequenceEmail({
          to: trimmedEmail,
          step: SEQUENCE_STEP.WELCOME,
          unsubscribeToken: lead.unsubscribe_token,
        })

        await supabaseAdmin.from('marketing_email_ledger').insert({
          lead_id: lead.id,
          step: SEQUENCE_STEP.WELCOME,
          step_label: welcomeContent.label,
          subject: welcomeContent.subject,
          watch_window_key: getWatchWindowKey(now),
        })

        await supabaseAdmin
          .from('marketing_leads')
          .update({
            current_step: WATCHMAN_FIRST_STEP,
            last_mail_sent_at: now.toISOString(),
          })
          .eq('id', lead.id)
      } catch (emailError: unknown) {
        const message = emailError instanceof Error ? emailError.message : 'Unknown error'
        logger.warn('Welcome email failed to send, but lead was captured', {
          email: trimmedEmail,
          error: message,
        })
      }
    }

    const metaTracking = parseMetaTrackingPayload(req.body)
    sendMetaWebsiteConversionFireAndForget({
      req,
      eventName: 'CompleteRegistration',
      tracking: metaTracking,
      userData: { email: trimmedEmail },
      customData: {
        content_name: typeof source === 'string' ? source : 'web-subscription',
        content_category: 'newsletter',
        value: 0,
        currency: 'USD',
        status: true,
      },
    })

    return res.status(200).json(
      createSuccessResponse({
        message: 'Suscripción exitosa. Bienvenido a la comunidad.',
        leadId: lead.id,
      })
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Unexpected error in lead subscription', { error: message })
    return res.status(500).json(createErrorResponse('Internal server error', 'INTERNAL_ERROR'))
  }
}
