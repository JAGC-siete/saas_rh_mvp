import { createClient } from '@supabase/supabase-js'
import { logger } from '../logger'
import {
  getWatchWindowKey,
  normalizeLeadSource,
  SEQUENCE_CONTENT,
  SEQUENCE_STEP,
  WATCHMAN_FIRST_STEP,
} from '../marketing/email-sequence-ledger'
import { INFO_SEQUENCE_WELCOME_DELAY_HOURS } from '../marketing/info-pack-email'
import { sendSequenceEmail } from '../marketing/send-sequence-email'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type InfoSequenceWelcomeResult = {
  eligible: number
  sent: number
  dryRun?: boolean
  error?: string
}

async function hasWelcomeInLedger(leadId: string): Promise<boolean> {
  const { count, error } = await supabaseAdmin
    .from('marketing_email_ledger')
    .select('id', { count: 'exact', head: true })
    .eq('lead_id', leadId)
    .eq('step', SEQUENCE_STEP.WELCOME)

  if (error) {
    logger.warn('Info welcome scheduler: ledger lookup failed', { leadId, error: error.message })
    return true
  }

  return (count ?? 0) > 0
}

/** Sends Step 0 welcome to /info leads 24h after the informational pack. */
export async function runInfoDelayedSequenceWelcome(
  now: Date = new Date()
): Promise<InfoSequenceWelcomeResult> {
  const dryRun = process.env.WATCHMAN_DRY_RUN === 'true'
  const cutoff = new Date(now.getTime() - INFO_SEQUENCE_WELCOME_DELAY_HOURS * 60 * 60 * 1000)

  const { data: leads, error } = await supabaseAdmin
    .from('marketing_leads')
    .select('id, email, source, current_step, unsubscribe_token, info_pack_sent_at, full_name')
    .eq('status', 'active')
    .eq('current_step', SEQUENCE_STEP.WELCOME)
    .not('info_pack_sent_at', 'is', null)
    .lte('info_pack_sent_at', cutoff.toISOString())

  if (error) {
    logger.error('Info welcome scheduler: fetch failed', { error: error.message })
    return { eligible: 0, sent: 0, error: error.message, dryRun }
  }

  const infoLeads = (leads ?? []).filter(
    (lead) => normalizeLeadSource(lead.source) === 'info' && lead.unsubscribe_token
  )

  let sent = 0
  const welcomeContent = SEQUENCE_CONTENT[SEQUENCE_STEP.WELCOME]

  for (const lead of infoLeads) {
    if (await hasWelcomeInLedger(lead.id)) {
      continue
    }

    try {
      await sendSequenceEmail({
        to: lead.email,
        step: SEQUENCE_STEP.WELCOME,
        unsubscribeToken: lead.unsubscribe_token,
        source: lead.source ?? 'info',
        dryRun,
      })

      if (!dryRun) {
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
      }

      sent += 1
      logger.info('Info delayed sequence welcome sent', { email: lead.email, dryRun })
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error'
      logger.error('Info delayed sequence welcome failed', { email: lead.email, error: message })
    }
  }

  return { eligible: infoLeads.length, sent, dryRun }
}
