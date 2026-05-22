import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { createSuccessResponse, createErrorResponse } from '../../../lib/security/api-responses'
import { logger } from '../../../lib/logger'
import {
  getWatchWindowKey,
  SEQUENCE_CONTENT,
  SEQUENCE_STEP,
  WATCHMAN_FIRST_STEP,
} from '../../../lib/marketing/email-sequence-ledger'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM_ADDRESS = 'jorgearturo@humanosisu.net'

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

    const { data: lead, error: dbError } = await supabaseAdmin
      .from('marketing_leads')
      .upsert(
        {
          email: trimmedEmail,
          source: source || 'web-subscription',
          status: 'active',
          current_step: SEQUENCE_STEP.WELCOME,
        },
        { onConflict: 'email' }
      )
      .select()
      .single()

    if (dbError) {
      logger.error('Error capturing lead', { email: trimmedEmail, error: dbError.message })
      return res.status(500).json(createErrorResponse('Database error', 'DATABASE_ERROR'))
    }

    try {
      await resend.emails.send({
        from: FROM_ADDRESS,
        to: trimmedEmail,
        subject: welcomeContent.subject,
        text: welcomeContent.text,
      })

      const watchWindowKey = getWatchWindowKey(now)

      await supabaseAdmin.from('marketing_email_ledger').insert({
        lead_id: lead.id,
        step: SEQUENCE_STEP.WELCOME,
        step_label: welcomeContent.label,
        subject: welcomeContent.subject,
        watch_window_key: watchWindowKey,
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

    return res.status(200).json(createSuccessResponse({
      message: 'Suscripción exitosa. Bienvenido a la comunidad.',
      leadId: lead.id,
    }))
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Unexpected error in lead subscription', { error: message })
    return res.status(500).json(createErrorResponse('Internal server error', 'INTERNAL_ERROR'))
  }
}
