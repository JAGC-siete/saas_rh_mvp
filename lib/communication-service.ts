import { createAdminClient } from './supabase/server'
import { emailService } from './email-service'
import { notificationManager } from './notification-providers'
import { logger } from './logger'
import { buildBroadcastEmailHtml, buildBroadcastEmailText, type BroadcastBlock } from './emails/broadcast'
import type { CampaignRecipient, CampaignRow, CommSegment } from './communications/schema'

const ADMIN_SEGMENT_ROLES = ['company_admin', 'hr_manager', 'manager']
const BADGE_BY_DEFAULT = 'Novedades'

/** Renders a campaign row into branded HTML + text using the SISU dark template. */
export function renderCampaignEmail(campaign: Pick<CampaignRow, 'subject' | 'intro' | 'blocks' | 'cta_url' | 'cta_label'>) {
  const input = {
    badge: BADGE_BY_DEFAULT,
    title: campaign.subject,
    intro: campaign.intro ?? undefined,
    blocks: (Array.isArray(campaign.blocks) ? campaign.blocks : []) as BroadcastBlock[],
    ctaUrl: campaign.cta_url ?? undefined,
    ctaLabel: campaign.cta_label ?? undefined,
  }
  return { html: buildBroadcastEmailHtml(input), text: buildBroadcastEmailText(input) }
}

/**
 * Builds an id -> email map from Supabase Auth (emails live in auth.users, not
 * in user_profiles). Paginates through admin.listUsers.
 */
async function buildAuthEmailMap(admin: ReturnType<typeof createAdminClient>): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  const perPage = 200
  let page = 1
  for (let i = 0; i < 50; i++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) {
      logger.error('communications: listUsers failed', { error: error.message, page })
      break
    }
    const users = data?.users ?? []
    for (const u of users) {
      if (u.id && u.email) map.set(u.id, u.email)
    }
    if (users.length < perPage) break
    page += 1
  }
  return map
}

/**
 * Resolves the recipient audience for a segment. Returns unique {id, email}.
 * - active_admins: active admin-role profiles.
 * - new_admins: admin-role profiles created in the last 7 days.
 */
export async function resolveAudience(segment: CommSegment): Promise<CampaignRecipient[]> {
  const admin = createAdminClient()

  let query = admin
    .from('user_profiles')
    .select('id, role, is_active, created_at')
    .in('role', ADMIN_SEGMENT_ROLES)
    .eq('is_active', true)

  if (segment === 'new_admins') {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    query = query.gte('created_at', sevenDaysAgo)
  }

  const { data: profiles, error } = await query
  if (error) {
    logger.error('communications: failed to fetch profiles', { error: error.message, segment })
    throw new Error('Failed to resolve audience')
  }

  if (!profiles || profiles.length === 0) return []

  const emailMap = await buildAuthEmailMap(admin)

  const recipients: CampaignRecipient[] = []
  const seen = new Set<string>()
  for (const p of profiles) {
    const email = emailMap.get(p.id)
    if (email && !seen.has(email)) {
      seen.add(email)
      recipients.push({ id: p.id, email })
    }
  }
  return recipients
}

export interface SendResult {
  success: number
  failed: number
}

/**
 * Sends the campaign email to each recipient using the shared emailService
 * (Resend with retry), logging per-recipient delivery and updating campaign
 * status. Renders the branded HTML from the campaign's structured content.
 */
export async function sendMassCommunication(
  campaignId: string,
  recipients: CampaignRecipient[]
): Promise<SendResult> {
  const admin = createAdminClient()

  const { data: campaign, error: campaignError } = await admin
    .from('communication_campaigns')
    .select('subject, intro, blocks, cta_url, cta_label')
    .eq('id', campaignId)
    .single()

  if (campaignError || !campaign) {
    throw new Error('Campaign not found')
  }

  const config = await notificationManager.getConfigForCompany('default')
  if (!config) {
    throw new Error('Email configuration not available')
  }

  const { html, text } = renderCampaignEmail(campaign as CampaignRow)
  const result: SendResult = { success: 0, failed: 0 }

  for (const user of recipients) {
    try {
      const sent = await emailService.sendEmail(config, {
        to: user.email,
        subject: (campaign as CampaignRow).subject,
        text,
        html,
      })

      await admin.from('communication_recipients').insert({
        campaign_id: campaignId,
        user_id: user.id,
        email: user.email,
        status: sent.success ? 'delivered' : 'failed',
        error_message: sent.success ? null : sent.error ?? 'unknown error',
      })

      if (sent.success) result.success += 1
      else result.failed += 1
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'unknown error'
      await admin.from('communication_recipients').insert({
        campaign_id: campaignId,
        user_id: user.id,
        email: user.email,
        status: 'failed',
        error_message: message,
      })
      result.failed += 1
    }
  }

  await admin
    .from('communication_campaigns')
    .update({ status: result.failed > 0 && result.success === 0 ? 'failed' : 'sent' })
    .eq('id', campaignId)

  logger.info('communications: campaign send completed', { campaignId, ...result })
  return result
}

export interface DispatchResult {
  scanned: number
  dispatched: number
  errors: number
}

/**
 * Dispatches scheduled campaigns whose time has arrived. Used by the cron.
 * Flips status to 'sending' first (guard against concurrent runs), resolves the
 * audience and sends.
 */
export async function dispatchScheduledCampaigns(now: Date = new Date()): Promise<DispatchResult> {
  const admin = createAdminClient()
  const result: DispatchResult = { scanned: 0, dispatched: 0, errors: 0 }

  const { data, error } = await admin
    .from('communication_campaigns')
    .select('id, target_segment')
    .eq('status', 'scheduled')
    .lte('scheduled_at', now.toISOString())
    .limit(50)

  if (error) {
    logger.error('communications dispatch: query failed', error)
    throw error
  }

  const campaigns = data ?? []
  result.scanned = campaigns.length

  for (const c of campaigns) {
    try {
      // Claim the campaign so a concurrent run does not double-send.
      const { data: claimed, error: claimError } = await admin
        .from('communication_campaigns')
        .update({ status: 'sending' })
        .eq('id', c.id)
        .eq('status', 'scheduled')
        .select('id')
        .single()

      if (claimError || !claimed) continue

      const segment = (c.target_segment ?? 'active_admins') as CommSegment
      const recipients = await resolveAudience(segment)
      if (recipients.length === 0) {
        await admin.from('communication_campaigns').update({ status: 'failed' }).eq('id', c.id)
        result.errors += 1
        continue
      }

      await sendMassCommunication(c.id, recipients)
      result.dispatched += 1
    } catch (err) {
      result.errors += 1
      logger.error('communications dispatch: campaign error', { campaignId: c.id, err })
      await admin.from('communication_campaigns').update({ status: 'failed' }).eq('id', c.id)
    }
  }

  logger.info('communications dispatch: completed', result)
  return result
}
