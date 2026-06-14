import { createAdminClient } from './supabase/server'
import { emailService } from './email-service'
import { notificationManager } from './notification-providers'
import { logger } from './logger'
import type { CampaignRecipient, CommSegment } from './communications/schema'

const ADMIN_SEGMENT_ROLES = ['company_admin', 'hr_manager', 'manager']

/**
 * Builds an id -> email map from Supabase Auth (emails live in auth.users, not
 * in user_profiles). Paginates through admin.listUsers.
 */
async function buildAuthEmailMap(admin: ReturnType<typeof createAdminClient>): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  const perPage = 200
  let page = 1
  // Cap pages defensively to avoid unbounded loops.
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
 * (Resend with retry), logging per-recipient delivery to communication_recipients
 * and updating the campaign status at the end.
 */
export async function sendMassCommunication(
  campaignId: string,
  recipients: CampaignRecipient[]
): Promise<SendResult> {
  const admin = createAdminClient()

  const { data: campaign, error: campaignError } = await admin
    .from('communication_campaigns')
    .select('subject, body')
    .eq('id', campaignId)
    .single()

  if (campaignError || !campaign) {
    throw new Error('Campaign not found')
  }

  const config = await notificationManager.getConfigForCompany('default')
  if (!config) {
    throw new Error('Email configuration not available')
  }

  const result: SendResult = { success: 0, failed: 0 }

  for (const user of recipients) {
    try {
      const sent = await emailService.sendEmail(config, {
        to: user.email,
        subject: campaign.subject,
        text: campaign.body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
        html: campaign.body,
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
