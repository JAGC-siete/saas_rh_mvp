import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { logger } from '../logger'
import {
  getWatchWindowKey,
  isMoreSpecificSource,
  SEQUENCE_COMPLETE_STEP,
  SEQUENCE_CONTENT,
  SEQUENCE_STEP,
  WATCHMAN_FIRST_STEP,
} from './email-sequence-ledger'
import { isMarketingExcluded } from './is-marketing-excluded'
import { sendSequenceEmail } from './send-sequence-email'
import { generateUnsubscribeToken } from './unsubscribe'

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
  source: string | null
}

export type EnrollMarketingLeadInput = {
  email: string
  source: string
  supabase?: SupabaseClient
}

export type EnrollMarketingLeadResult = {
  leadId: string | null
  welcomeSent: boolean
  skippedReason?: 'excluded' | 'completed'
}

async function hasWelcomeInLedger(
  client: SupabaseClient,
  leadId: string
): Promise<boolean> {
  const { count, error } = await client
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

export async function enrollMarketingLead(
  input: EnrollMarketingLeadInput
): Promise<EnrollMarketingLeadResult> {
  const client = input.supabase ?? supabaseAdmin
  const trimmedEmail = input.email.trim().toLowerCase()
  const source = input.source.trim() || 'suscripcion-page'
  const now = new Date()
  const welcomeContent = SEQUENCE_CONTENT[SEQUENCE_STEP.WELCOME]

  if (await isMarketingExcluded(trimmedEmail, client)) {
    logger.info('Marketing enroll skipped: current customer', { email: trimmedEmail, source })
    return { leadId: null, welcomeSent: false, skippedReason: 'excluded' }
  }

  const { data: existing, error: fetchError } = await client
    .from('marketing_leads')
    .select('id, email, status, current_step, unsubscribe_token, source')
    .eq('email', trimmedEmail)
    .maybeSingle()

  if (fetchError) {
    logger.error('Error fetching marketing lead', { email: trimmedEmail, error: fetchError.message })
    throw new Error('Database error fetching marketing lead')
  }

  if (
    existing &&
    (existing.status === 'completed' || existing.current_step >= SEQUENCE_COMPLETE_STEP)
  ) {
    return { leadId: existing.id, welcomeSent: false, skippedReason: 'completed' }
  }

  let lead: MarketingLeadRow
  let shouldSendWelcome = false

  if (!existing) {
    const token = generateUnsubscribeToken()
    const { data: inserted, error: insertError } = await client
      .from('marketing_leads')
      .insert({
        email: trimmedEmail,
        source,
        status: 'active',
        current_step: SEQUENCE_STEP.WELCOME,
        unsubscribe_token: token,
      })
      .select('id, email, status, current_step, unsubscribe_token, source')
      .single()

    if (insertError || !inserted) {
      logger.error('Error capturing marketing lead', {
        email: trimmedEmail,
        error: insertError?.message,
      })
      throw new Error('Database error capturing marketing lead')
    }

    lead = inserted as MarketingLeadRow
    shouldSendWelcome = true
  } else if (existing.status === 'unsubscribed') {
    const { data: reactivated, error: updateError } = await client
      .from('marketing_leads')
      .update({
        status: 'active',
        source,
        unsubscribed_at: null,
        current_step: WATCHMAN_FIRST_STEP,
      })
      .eq('id', existing.id)
      .select('id, email, status, current_step, unsubscribe_token, source')
      .single()

    if (updateError || !reactivated) {
      logger.error('Error reactivating marketing lead', {
        email: trimmedEmail,
        error: updateError?.message,
      })
      throw new Error('Database error reactivating marketing lead')
    }

    lead = reactivated as MarketingLeadRow
    shouldSendWelcome = true
  } else {
    lead = existing as MarketingLeadRow

    if (isMoreSpecificSource(source, existing.source)) {
      await client.from('marketing_leads').update({ source }).eq('id', existing.id)
      lead = { ...lead, source }
    }

    if (existing.current_step <= SEQUENCE_STEP.WELCOME) {
      shouldSendWelcome = !(await hasWelcomeInLedger(client, existing.id))
    }
  }

  let welcomeSent = false

  if (shouldSendWelcome) {
    try {
      await sendSequenceEmail({
        to: trimmedEmail,
        step: SEQUENCE_STEP.WELCOME,
        unsubscribeToken: lead.unsubscribe_token,
        source,
      })

      await client.from('marketing_email_ledger').insert({
        lead_id: lead.id,
        step: SEQUENCE_STEP.WELCOME,
        step_label: welcomeContent.label,
        subject: welcomeContent.subject,
        watch_window_key: getWatchWindowKey(now),
      })

      await client
        .from('marketing_leads')
        .update({
          current_step: WATCHMAN_FIRST_STEP,
          last_mail_sent_at: now.toISOString(),
        })
        .eq('id', lead.id)

      welcomeSent = true
    } catch (emailError: unknown) {
      const message = emailError instanceof Error ? emailError.message : 'Unknown error'
      logger.warn('Welcome email failed to send, but lead was captured', {
        email: trimmedEmail,
        source,
        error: message,
      })
    }
  }

  return { leadId: lead.id, welcomeSent }
}
