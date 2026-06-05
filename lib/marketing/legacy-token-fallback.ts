/**
 * P4: Legacy mail_list_subscriptions token handling during sunset.
 * 30-day window applies to pending → active activation (confirm + stale opt-in).
 * Unsubscribe via legacy confirmation_token always honored while table exists (compliance).
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { logger } from '../logger'
import { generateUnsubscribeToken } from './unsubscribe'
import { WATCHMAN_FIRST_STEP } from './email-sequence-ledger'
import { LEGACY_PENDING_MAX_AGE_DAYS, mapLegacyMailListRow, type LegacyMailStatus } from './legacy-migration'

export { LEGACY_PENDING_MAX_AGE_DAYS }

export type LegacySubscriptionRow = {
  id: string
  email: string
  status: LegacyMailStatus
  created_at: string
  source: string | null
}

export function isWithinLegacyTokenWindow(createdAt: Date, now: Date = new Date()): boolean {
  const maxAgeMs = LEGACY_PENDING_MAX_AGE_DAYS * 24 * 60 * 60 * 1000
  return now.getTime() - createdAt.getTime() <= maxAgeMs
}

export function isLegacyTableMissingError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  if (error.code === '42P01') return true
  return /mail_list_subscriptions|does not exist/i.test(error.message || '')
}

export type LegacyConfirmResult =
  | { ok: true; already: boolean }
  | { ok: false; reason: 'not_found' | 'expired' | 'table_missing' | 'db_error' }

export type LegacyUnsubscribeResult =
  | { ok: true; already: boolean }
  | { ok: false; reason: 'not_found' | 'table_missing' | 'db_error' }

function getAdminClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function ensureWelcomeLedgerMarker(supabase: SupabaseClient, leadId: string): Promise<void> {
  const { count } = await supabase
    .from('marketing_email_ledger')
    .select('id', { count: 'exact', head: true })
    .eq('lead_id', leadId)
    .eq('step', 0)

  if ((count ?? 0) > 0) return

  await supabase.from('marketing_email_ledger').insert({
    lead_id: leadId,
    step: 0,
    step_label: 'Legacy confirm / backfill',
    subject: 'Legacy opt-in (no resend)',
    watch_window_key: null,
  })
}

async function syncMarketingLeadFromLegacy(
  supabase: SupabaseClient,
  legacy: LegacySubscriptionRow,
  forceActive: boolean
): Promise<{ leadId: string | null; error?: string }> {
  const email = legacy.email.trim().toLowerCase()
  const now = new Date()
  const mapped = mapLegacyMailListRow({
    status: legacy.status,
    createdAt: new Date(legacy.created_at),
    now,
  })

  const targetStatus = forceActive ? 'active' : mapped.status
  const targetStep = forceActive ? WATCHMAN_FIRST_STEP : mapped.currentStep

  const { data: existing } = await supabase
    .from('marketing_leads')
    .select('id, status')
    .eq('email', email)
    .maybeSingle()

  if (!existing) {
    const { data: inserted, error } = await supabase
      .from('marketing_leads')
      .insert({
        email,
        source: legacy.source || 'legacy-mail-list',
        status: targetStatus,
        current_step: targetStep,
        unsubscribe_token: generateUnsubscribeToken(),
        unsubscribed_at: targetStatus === 'unsubscribed' ? now.toISOString() : null,
        created_at: legacy.created_at,
      })
      .select('id')
      .single()

    if (error || !inserted) {
      return { leadId: null, error: error?.message }
    }

    if (targetStatus === 'active' && mapped.recordLedgerMarker) {
      await ensureWelcomeLedgerMarker(supabase, inserted.id)
    }

    return { leadId: inserted.id }
  }

  if (targetStatus === 'active') {
    const { error } = await supabase
      .from('marketing_leads')
      .update({
        status: 'active',
        current_step: targetStep,
        unsubscribed_at: null,
      })
      .eq('id', existing.id)

    if (error) return { leadId: null, error: error.message }
    if (mapped.recordLedgerMarker) {
      await ensureWelcomeLedgerMarker(supabase, existing.id)
    }
  } else if (existing.status !== 'unsubscribed') {
    await supabase
      .from('marketing_leads')
      .update({
        status: 'unsubscribed',
        current_step: targetStep,
        unsubscribed_at: now.toISOString(),
      })
      .eq('id', existing.id)
  }

  return { leadId: existing.id }
}

/** P4: Confirm legacy double opt-in → marketing_leads (pending >30d rejected). */
export async function confirmLegacySubscription(token: string): Promise<LegacyConfirmResult> {
  const supabase = getAdminClient()

  const { data: legacy, error: fetchError } = await supabase
    .from('mail_list_subscriptions')
    .select('id, email, status, created_at, source')
    .eq('confirmation_token', token)
    .maybeSingle()

  if (isLegacyTableMissingError(fetchError)) {
    return { ok: false, reason: 'table_missing' }
  }

  if (fetchError || !legacy) {
    return { ok: false, reason: 'not_found' }
  }

  const row = legacy as LegacySubscriptionRow
  const createdAt = new Date(row.created_at)

  if (row.status === 'pending' && !isWithinLegacyTokenWindow(createdAt)) {
    return { ok: false, reason: 'expired' }
  }

  if (row.status === 'confirmed') {
    const sync = await syncMarketingLeadFromLegacy(supabase, row, true)
    if (sync.error) return { ok: false, reason: 'db_error' }
    return { ok: true, already: true }
  }

  const forceActive = row.status === 'pending' || row.status === 'unsubscribed'
  const sync = await syncMarketingLeadFromLegacy(supabase, row, forceActive)
  if (sync.error) return { ok: false, reason: 'db_error' }

  const { error: updateError } = await supabase
    .from('mail_list_subscriptions')
    .update({
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
      unsubscribed_at: null,
    })
    .eq('id', row.id)

  if (updateError) {
    logger.error('Legacy confirm: marketing synced but legacy update failed', {
      legacyId: row.id,
      error: updateError.message,
    })
  }

  logger.info('Legacy subscription confirmed → marketing_leads', {
    legacyId: row.id,
    emailPartial: row.email.substring(0, 3) + '***',
  })

  return { ok: true, already: false }
}

/** P4: Unsubscribe via legacy confirmation_token; syncs marketing_leads by email. */
export async function unsubscribeLegacySubscription(token: string): Promise<LegacyUnsubscribeResult> {
  const supabase = getAdminClient()

  const { data: legacy, error: fetchError } = await supabase
    .from('mail_list_subscriptions')
    .select('id, email, status, created_at, source')
    .eq('confirmation_token', token)
    .maybeSingle()

  if (isLegacyTableMissingError(fetchError)) {
    return { ok: false, reason: 'table_missing' }
  }

  if (fetchError || !legacy) {
    return { ok: false, reason: 'not_found' }
  }

  const row = legacy as LegacySubscriptionRow

  if (row.status === 'unsubscribed') {
    await syncMarketingLeadFromLegacy(supabase, { ...row, status: 'unsubscribed' }, false)
    return { ok: true, already: true }
  }

  const { error: updateError } = await supabase
    .from('mail_list_subscriptions')
    .update({
      status: 'unsubscribed',
      unsubscribed_at: new Date().toISOString(),
    })
    .eq('id', row.id)

  if (updateError) {
    return { ok: false, reason: 'db_error' }
  }

  await syncMarketingLeadFromLegacy(supabase, { ...row, status: 'unsubscribed' }, false)

  logger.info('Legacy mail list unsubscribed', { legacyId: row.id })
  return { ok: true, already: false }
}
