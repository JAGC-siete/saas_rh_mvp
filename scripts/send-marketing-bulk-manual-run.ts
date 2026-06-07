/**
 * One-time bulk: HTML invite (non-customers) + text welcome manual (everyone).
 *
 * Usage:
 *   railway run npx tsx scripts/send-marketing-bulk-manual-run.ts
 *   WATCHMAN_DRY_RUN=true railway run npx tsx scripts/send-marketing-bulk-manual-run.ts
 */

import { createClient } from '@supabase/supabase-js'
import { sendBulkManualWelcomeEmail } from '../lib/emails/marketing-bulk-manual-welcome'
import { sendMarketingLeadInviteEmail } from '../lib/emails/marketing-lead-invite'
import { logger } from '../lib/logger'
import {
  getWatchWindowKey,
  SEQUENCE_CONTENT,
  SEQUENCE_STEP,
  WATCHMAN_FIRST_STEP,
} from '../lib/marketing/email-sequence-ledger'

const DELAY_MS = Number(process.env.BULK_SEND_DELAY_MS ?? 350)

type LeadRow = {
  id: string
  email: string
  status: string
  unsubscribe_token: string | null
  current_step: number
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function nombreFromEmail(email: string): string {
  const local = email.split('@')[0]?.trim() || 'Equipo'
  const firstSegment = local.split(/[._-]/)[0] || local
  if (!firstSegment) return 'Equipo'
  return firstSegment.charAt(0).toUpperCase() + firstSegment.slice(1).toLowerCase()
}

async function main() {
  const dryRun = process.env.WATCHMAN_DRY_RUN === 'true'
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  const { data: customerRows, error: customerErr } = await supabase
    .from('marketing_current_customer_contacts')
    .select('email')

  if (customerErr) {
    throw new Error(`Failed to load customer exclusions: ${customerErr.message}`)
  }

  const customerEmails = new Set(
    (customerRows ?? []).map((r) => String(r.email).trim().toLowerCase()).filter(Boolean)
  )

  const { data: leads, error: leadsErr } = await supabase
    .from('marketing_leads')
    .select('id, email, status, unsubscribe_token, current_step')
    .neq('status', 'unsubscribed')
    .not('unsubscribe_token', 'is', null)
    .order('created_at', { ascending: true })

  if (leadsErr) {
    throw new Error(`Failed to load marketing_leads: ${leadsErr.message}`)
  }

  const rows = (leads ?? []) as LeadRow[]
  const inviteEligible = rows.filter((l) => !customerEmails.has(l.email.trim().toLowerCase()))

  console.log('Bulk manual send starting', {
    dryRun,
    totalLeads: rows.length,
    inviteEligible: inviteEligible.length,
    customersSkippedForInvite: rows.length - inviteEligible.length,
    delayMs: DELAY_MS,
  })

  let welcomeSent = 0
  let welcomeFailed = 0
  let inviteSent = 0
  let inviteFailed = 0
  let inviteSkippedCustomer = 0

  const welcomeContent = SEQUENCE_CONTENT[SEQUENCE_STEP.WELCOME]
  const now = new Date()
  const windowKey = getWatchWindowKey(now)

  for (let i = 0; i < rows.length; i++) {
    const lead = rows[i]
    const email = lead.email.trim().toLowerCase()
    const nombre = nombreFromEmail(email)
    const token = lead.unsubscribe_token!
    const isCustomer = customerEmails.has(email)

    try {
      await sendBulkManualWelcomeEmail({
        to: email,
        nombre,
        unsubscribeToken: token,
        dryRun,
      })

      if (!dryRun) {
        const { count } = await supabase
          .from('marketing_email_ledger')
          .select('id', { count: 'exact', head: true })
          .eq('lead_id', lead.id)
          .eq('step', SEQUENCE_STEP.WELCOME)
          .eq('step_label', 'Bulk manual welcome')

        if ((count ?? 0) === 0) {
          await supabase.from('marketing_email_ledger').insert({
            lead_id: lead.id,
            step: SEQUENCE_STEP.WELCOME,
            step_label: 'Bulk manual welcome',
            subject: welcomeContent.subject,
            watch_window_key: windowKey,
          })
        }

        if (lead.current_step < WATCHMAN_FIRST_STEP) {
          await supabase
            .from('marketing_leads')
            .update({
              current_step: WATCHMAN_FIRST_STEP,
              last_mail_sent_at: now.toISOString(),
            })
            .eq('id', lead.id)
        }
      }

      welcomeSent++
    } catch (err: unknown) {
      welcomeFailed++
      const message = err instanceof Error ? err.message : String(err)
      logger.warn('Bulk welcome failed', { email, error: message })
    }

    await sleep(DELAY_MS)

    if (isCustomer) {
      inviteSkippedCustomer++
    } else {
      try {
        const invite = await sendMarketingLeadInviteEmail({
          to: email,
          nombre,
          unsubscribeToken: token,
          dryRun,
        })
        if (invite.skipped) {
          console.log('Invite dry-run skip at', email)
        } else {
          inviteSent++
        }
      } catch (err: unknown) {
        inviteFailed++
        const message = err instanceof Error ? err.message : String(err)
        logger.warn('Bulk invite failed', { email, error: message })
      }

      await sleep(DELAY_MS)
    }

    if ((i + 1) % 25 === 0 || i === rows.length - 1) {
      console.log(`Progress ${i + 1}/${rows.length}`, {
        welcomeSent,
        welcomeFailed,
        inviteSent,
        inviteFailed,
        inviteSkippedCustomer,
      })
    }
  }

  console.log('Bulk manual send complete', {
    dryRun,
    welcomeSent,
    welcomeFailed,
    inviteSent,
    inviteFailed,
    inviteSkippedCustomer,
  })
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err)
  console.error('Bulk send aborted:', message)
  process.exit(1)
})
