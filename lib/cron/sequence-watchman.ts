import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { logger } from '../logger'
import {
  getWatchWindowKey,
  isBiMonthlyWatchDay,
  SEQUENCE_CONTENT,
  SEQUENCE_COMPLETE_STEP,
  WATCHMAN_FIRST_STEP,
  WATCHMAN_LAST_STEP,
} from '../marketing/email-sequence-ledger'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_ADDRESS = 'jorgearturo@humanosisu.net'

async function hasWatchmanSendInWindow(
  supabase: SupabaseClient,
  leadId: string,
  windowKey: string
): Promise<boolean> {
  const { count, error } = await supabase
    .from('marketing_email_ledger')
    .select('id', { count: 'exact', head: true })
    .eq('lead_id', leadId)
    .eq('watch_window_key', windowKey)
    .gte('step', WATCHMAN_FIRST_STEP)

  if (error) {
    logger.warn('Watchman ledger lookup failed', { leadId, windowKey, error: error.message })
    return true
  }

  return (count ?? 0) > 0
}

async function recordLedgerEntry(
  supabase: SupabaseClient,
  leadId: string,
  step: number,
  watchWindowKey: string | null
) {
  const content = SEQUENCE_CONTENT[step as keyof typeof SEQUENCE_CONTENT]
  if (!content) return

  const { error } = await supabase.from('marketing_email_ledger').insert({
    lead_id: leadId,
    step,
    step_label: content.label,
    subject: content.subject,
    watch_window_key: watchWindowKey,
  })

  if (error) {
    logger.warn('Failed to record email ledger entry', { leadId, step, error: error.message })
  }
}

export async function runSequenceWatchman(now: Date = new Date()) {
  logger.info('Sequence Watchman: checking bi-monthly watch window...')

  if (!isBiMonthlyWatchDay(now)) {
    logger.info('Outside bi-monthly watch window (days 12–16 and 26–30). Skipping.')
    return { skipped: true, sent: 0 }
  }

  const windowKey = getWatchWindowKey(now)
  if (!windowKey) {
    return { skipped: true, sent: 0 }
  }

  const { data: leads, error } = await supabaseAdmin
    .from('marketing_leads')
    .select('id, email, current_step')
    .eq('status', 'active')
    .gte('current_step', WATCHMAN_FIRST_STEP)
    .lt('current_step', SEQUENCE_COMPLETE_STEP)

  if (error) {
    logger.error('Watchman failed to fetch leads', { error: error.message })
    return { skipped: false, sent: 0, error: error.message }
  }

  let sent = 0

  for (const lead of leads ?? []) {
    const step = lead.current_step
    const content = SEQUENCE_CONTENT[step as keyof typeof SEQUENCE_CONTENT]

    if (!content || step < WATCHMAN_FIRST_STEP || step > WATCHMAN_LAST_STEP) {
      continue
    }

    if (await hasWatchmanSendInWindow(supabaseAdmin, lead.id, windowKey)) {
      logger.info(`Skipping ${lead.email}: already received a pain-point email this window`)
      continue
    }

    try {
      await resend.emails.send({
        from: FROM_ADDRESS,
        to: lead.email,
        subject: content.subject,
        text: content.text,
      })

      await recordLedgerEntry(supabaseAdmin, lead.id, step, windowKey)

      await supabaseAdmin
        .from('marketing_leads')
        .update({
          current_step: step + 1,
          last_mail_sent_at: now.toISOString(),
          status: step + 1 >= SEQUENCE_COMPLETE_STEP ? 'completed' : 'active',
        })
        .eq('id', lead.id)

      sent += 1
      logger.info(`Sent sequence email Step ${step} (${content.label}) to ${lead.email}`)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error'
      logger.error(`Failed to send Step ${step} to ${lead.email}`, { error: message })
    }
  }

  logger.info('Sequence Watchman finished', { windowKey, sent })
  return { skipped: false, sent, windowKey }
}
