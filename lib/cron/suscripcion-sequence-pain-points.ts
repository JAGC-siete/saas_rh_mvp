import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { logger } from '../logger'
import {
  SEQUENCE_COMPLETE_STEP,
  SEQUENCE_CONTENT,
  WATCHMAN_FIRST_STEP,
  WATCHMAN_LAST_STEP,
} from '../marketing/email-sequence-ledger'
import { sendSequenceEmail } from '../marketing/send-sequence-email'
import {
  isSuscripcionAcceleratedLead,
  isSuscripcionPainPointDue,
} from '../marketing/suscripcion-sequence-timing'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type SuscripcionAcceleratedPainPointsResult = {
  eligible: number
  sent: number
  dryRun?: boolean
  error?: string
}

async function hasPainPointInLedger(
  supabase: SupabaseClient,
  leadId: string,
  step: number
): Promise<boolean> {
  const content = SEQUENCE_CONTENT[step as keyof typeof SEQUENCE_CONTENT]
  if (!content) return true

  const { count, error } = await supabase
    .from('marketing_email_ledger')
    .select('id', { count: 'exact', head: true })
    .eq('lead_id', leadId)
    .eq('step', step)
    .eq('step_label', content.label)

  if (error) {
    logger.warn('Suscripcion accelerated sequence: ledger lookup failed', {
      leadId,
      step,
      error: error.message,
    })
    return true
  }

  return (count ?? 0) > 0
}

async function recordLedgerEntry(supabase: SupabaseClient, leadId: string, step: number) {
  const content = SEQUENCE_CONTENT[step as keyof typeof SEQUENCE_CONTENT]
  if (!content) return

  const { error } = await supabase.from('marketing_email_ledger').insert({
    lead_id: leadId,
    step,
    step_label: content.label,
    subject: content.subject,
    watch_window_key: `suscripcion-accel:${step}`,
  })

  if (error) {
    logger.warn('Suscripcion accelerated sequence: failed to record ledger', {
      leadId,
      step,
      error: error.message,
    })
  }
}

/** Sends PP1–PP5 to /suscripcion leads on a fixed 48h cadence. */
export async function runSuscripcionAcceleratedPainPoints(
  now: Date = new Date()
): Promise<SuscripcionAcceleratedPainPointsResult> {
  const dryRun = process.env.WATCHMAN_DRY_RUN === 'true'

  const { data: leads, error } = await supabaseAdmin
    .from('marketing_leads')
    .select(
      'id, email, source, current_step, unsubscribe_token, full_name, info_pack_sent_at, last_mail_sent_at'
    )
    .eq('status', 'active')
    .gte('current_step', WATCHMAN_FIRST_STEP)
    .lt('current_step', SEQUENCE_COMPLETE_STEP)

  if (error) {
    logger.error('Suscripcion accelerated sequence: fetch failed', { error: error.message })
    return { eligible: 0, sent: 0, error: error.message, dryRun }
  }

  const suscripcionLeads = (leads ?? []).filter(
    (lead) => isSuscripcionAcceleratedLead(lead.source) && lead.unsubscribe_token
  )

  let sent = 0

  for (const lead of suscripcionLeads) {
    const step = lead.current_step

    if (step < WATCHMAN_FIRST_STEP || step > WATCHMAN_LAST_STEP) {
      continue
    }

    if (
      !isSuscripcionPainPointDue({
        currentStep: step,
        packSentAt: lead.info_pack_sent_at,
        lastMailSentAt: lead.last_mail_sent_at,
        now,
      })
    ) {
      continue
    }

    if (await hasPainPointInLedger(supabaseAdmin, lead.id, step)) {
      continue
    }

    const content = SEQUENCE_CONTENT[step as keyof typeof SEQUENCE_CONTENT]
    if (!content) continue

    try {
      await sendSequenceEmail({
        to: lead.email,
        step,
        unsubscribeToken: lead.unsubscribe_token,
        source: lead.source ?? 'suscripcion',
        recipientName: lead.full_name,
        dryRun,
      })

      if (!dryRun) {
        await recordLedgerEntry(supabaseAdmin, lead.id, step)

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
      logger.info('Suscripcion accelerated pain point sent', {
        email: lead.email,
        step,
        label: content.label,
        dryRun,
      })
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error'
      logger.error('Suscripcion accelerated pain point failed', {
        email: lead.email,
        step,
        error: message,
      })
    }
  }

  return { eligible: suscripcionLeads.length, sent, dryRun }
}
