import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { logger } from '../logger'
import {
  getWatchWindowKey,
  isBiMonthlyWatchDay,
  SEQUENCE_COMPLETE_STEP,
  SEQUENCE_CONTENT,
  WATCHMAN_FIRST_STEP,
  WATCHMAN_LAST_STEP,
} from '../marketing/email-sequence-ledger'
import { sendSequenceEmail } from '../marketing/send-sequence-email'
import { isInfoAcceleratedLead } from '../marketing/info-sequence-timing'
import { isSuscripcionAcceleratedLead } from '../marketing/suscripcion-sequence-timing'
import { isActivarAcceleratedLead } from '../marketing/activar-sequence-timing'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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

export type SequenceWatchmanResult = {
  skipped: boolean
  sent: number
  windowKey?: string
  eligible?: number
  dryRun?: boolean
  error?: string
}

export async function runSequenceWatchman(now: Date = new Date()): Promise<SequenceWatchmanResult> {
  const dryRun = process.env.WATCHMAN_DRY_RUN === 'true'
  logger.info('Sequence Watchman: checking bi-monthly watch window...', { dryRun })

  if (!isBiMonthlyWatchDay(now)) {
    logger.info('Outside bi-monthly watch window (days 12–16 and 26–30). Skipping.')
    return { skipped: true, sent: 0, dryRun }
  }

  const windowKey = getWatchWindowKey(now)
  if (!windowKey) {
    return { skipped: true, sent: 0, dryRun }
  }

  const { data: leads, error } = await supabaseAdmin
    .from('marketing_leads')
    .select('id, email, current_step, unsubscribe_token, full_name, source')
    .eq('status', 'active')
    .gte('current_step', WATCHMAN_FIRST_STEP)
    .lt('current_step', SEQUENCE_COMPLETE_STEP)

  if (error) {
    logger.error('Watchman failed to fetch leads', { error: error.message })
    return { skipped: false, sent: 0, error: error.message, dryRun }
  }

  const eligible = leads?.length ?? 0
  let sent = 0

  for (const lead of leads ?? []) {
    const step = lead.current_step
    const content = SEQUENCE_CONTENT[step as keyof typeof SEQUENCE_CONTENT]

    if (!content || step < WATCHMAN_FIRST_STEP || step > WATCHMAN_LAST_STEP) {
      continue
    }

    // Accelerated leads use fixed 48h cadence via daily cron jobs.
    if (
      isInfoAcceleratedLead(lead.source) ||
      isSuscripcionAcceleratedLead(lead.source) ||
      isActivarAcceleratedLead(lead.source)
    ) {
      continue
    }

    if (!lead.unsubscribe_token) {
      logger.warn('Lead missing unsubscribe_token; skipping', { leadId: lead.id })
      continue
    }

    if (await hasWatchmanSendInWindow(supabaseAdmin, lead.id, windowKey)) {
      logger.info(`Skipping ${lead.email}: already received a pain-point email this window`)
      continue
    }

    try {
      await sendSequenceEmail({
        to: lead.email,
        step,
        unsubscribeToken: lead.unsubscribe_token,
        source: lead.source ?? undefined,
        recipientName: lead.full_name,
        dryRun,
      })

      if (!dryRun) {
        await recordLedgerEntry(supabaseAdmin, lead.id, step, windowKey)

        await supabaseAdmin
          .from('marketing_leads')
          .update({
            current_step: step + 1,
            last_mail_sent_at: now.toISOString(),
            status: step + 1 >= SEQUENCE_COMPLETE_STEP ? 'completed' : 'active',
          })
          .eq('id', lead.id)
      }

      sent += 1
      logger.info(`Sent sequence email Step ${step} (${content.label}) to ${lead.email}`, { dryRun })
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error'
      logger.error(`Failed to send Step ${step} to ${lead.email}`, { error: message })
    }
  }

  if (!dryRun && eligible > 0 && sent === 0) {
    logger.warn('Sequence Watchman: eligible leads but zero sends this run', {
      windowKey,
      eligible,
    })
  }

  logger.info('Sequence Watchman finished', { windowKey, sent, eligible, dryRun })
  return { skipped: false, sent, windowKey, eligible, dryRun }
}
