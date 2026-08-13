import { createAdminClient } from './supabase/server'
import { emailService } from './email-service'
import { notificationManager } from './notification-providers'
import { logger } from './logger'
import { buildBroadcastEmailHtml, buildBroadcastEmailText, type BroadcastBlock } from './emails/broadcast'
import type {
  AudiencePreview,
  AudienceStats,
  CampaignRecipient,
  CampaignRow,
  CommSegment,
} from './communications/schema'

const ADMIN_SEGMENT_ROLES = ['company_admin', 'hr_manager', 'manager']
const BADGE_BY_DEFAULT = 'Novedades'

export type AudienceErrorCode =
  | 'PROFILES_QUERY_FAILED'
  | 'AUTH_LIST_USERS_FAILED'
  | 'EMAIL_MAP_EMPTY'
  | 'NO_EMAIL_MATCH'

export class AudienceResolutionError extends Error {
  readonly code: AudienceErrorCode
  readonly stats: AudienceStats

  constructor(code: AudienceErrorCode, message: string, stats: AudienceStats) {
    super(message)
    this.name = 'AudienceResolutionError'
    this.code = code
    this.stats = stats
  }
}

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

interface AuthEmailLookupResult {
  map: Map<string, string>
  usersLoaded: number
  failed: boolean
  errorMessage?: string
}

function isAuthUserNotFoundError(error: { message?: string; code?: string }): boolean {
  const code = (error.code ?? '').toLowerCase()
  const msg = (error.message ?? '').toLowerCase()
  return code === 'user_not_found' || msg.includes('user not found')
}

/**
 * Resolves id -> email for the given profile ids via auth.admin.getUserById
 * (one lookup per profile, chunked). Emails live in auth.users, not user_profiles.
 */
async function resolveAuthEmailsForProfileIds(
  admin: ReturnType<typeof createAdminClient>,
  profileIds: string[],
  chunkSize = 15
): Promise<AuthEmailLookupResult> {
  const map = new Map<string, string>()
  let usersLoaded = 0
  let failed = false
  let errorMessage: string | undefined
  const unique = [...new Set(profileIds)]

  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize)
    await Promise.all(
      chunk.map(async (uid) => {
        try {
          const { data, error } = await admin.auth.admin.getUserById(uid)
          if (error) {
            if (isAuthUserNotFoundError(error)) return
            if (!failed) {
              failed = true
              errorMessage = error.message
              logger.error('communications: getUserById failed', { uid, error: error.message })
            }
            return
          }
          const user = data?.user
          if (!user?.id) return
          usersLoaded += 1
          if (user.email) map.set(user.id, user.email)
        } catch (e: unknown) {
          if (!failed) {
            failed = true
            errorMessage = e instanceof Error ? e.message : 'unknown error'
            logger.error('communications: getUserById exception', { uid, err: e })
          }
        }
      })
    )
  }

  return { map, usersLoaded, failed, errorMessage }
}

interface ProfileRow {
  id: string
  role: string
  is_active: boolean
  created_at: string
  company_id: string | null
}

function emptyStats(segment: CommSegment): AudienceStats {
  return {
    segment,
    profilesMatched: 0,
    authUsersLoaded: 0,
    recipientsResolved: 0,
    skippedNoEmail: 0,
    skippedDuplicateEmail: 0,
    listUsersFailed: false,
  }
}

function assertAudienceResolvable(stats: AudienceStats): void {
  if (stats.profilesQueryError) {
    throw new AudienceResolutionError(
      'PROFILES_QUERY_FAILED',
      'No se pudo consultar perfiles de usuario. Verifique SUPABASE_SERVICE_ROLE_KEY en el servidor.',
      stats
    )
  }

  if (stats.profilesMatched === 0) return

  if (stats.listUsersFailed) {
    throw new AudienceResolutionError(
      'AUTH_LIST_USERS_FAILED',
      'No se pudo consultar usuarios en Auth (getUserById). Verifique SUPABASE_SERVICE_ROLE_KEY en el servidor.',
      stats
    )
  }

  if (stats.authUsersLoaded === 0) {
    throw new AudienceResolutionError(
      'EMAIL_MAP_EMPTY',
      'Ningún perfil tiene usuario correspondiente en Auth. Revise que la service role key corresponda a este proyecto.',
      stats
    )
  }

  if (stats.recipientsResolved === 0) {
    throw new AudienceResolutionError(
      'NO_EMAIL_MATCH',
      `Hay ${stats.profilesMatched} perfiles elegibles pero ninguno tiene email en Auth (${stats.skippedNoEmail} sin cruce). Posible desajuste de IDs o clave incorrecta.`,
      stats
    )
  }
}

async function fetchSampleCompanyNames(
  admin: ReturnType<typeof createAdminClient>,
  companyIds: string[]
): Promise<string[]> {
  const unique = [...new Set(companyIds.filter(Boolean))].slice(0, 5)
  if (unique.length === 0) return []

  const { data, error } = await admin.from('companies').select('name').in('id', unique).limit(3)
  if (error) {
    logger.warn('communications: sample companies fetch failed', { error: error.message })
    return []
  }
  return (data ?? []).map((c) => c.name).filter(Boolean) as string[]
}

function buildPreviewWarnings(stats: AudienceStats): string[] {
  const warnings: string[] = []
  if (stats.profilesQueryError) {
    warnings.push('Error al consultar user_profiles. Revise SUPABASE_SERVICE_ROLE_KEY.')
  }
  if (stats.listUsersFailed) {
    warnings.push('auth.admin.getUserById falló. Revise SUPABASE_SERVICE_ROLE_KEY.')
  } else if (stats.profilesMatched > 0 && stats.authUsersLoaded === 0) {
    warnings.push('Ningún perfil tiene usuario correspondiente en Auth.')
  }
  if (stats.profilesMatched > 0 && stats.recipientsResolved === 0) {
    warnings.push(
      `${stats.profilesMatched} perfiles coinciden pero 0 tienen email en Auth (${stats.skippedNoEmail} sin cruce).`
    )
  }
  if (stats.skippedNoEmail > 0 && stats.recipientsResolved > 0) {
    warnings.push(`${stats.skippedNoEmail} perfil(es) omitido(s) por falta de email en Auth.`)
  }
  return warnings
}

/**
 * Resolves audience with diagnostic stats. Does not throw on empty segments;
 * throws AudienceResolutionError when profiles exist but emails cannot be resolved.
 */
export async function resolveAudienceDetailed(segment: CommSegment): Promise<{
  recipients: CampaignRecipient[]
  stats: AudienceStats
  sampleCompanyIds: string[]
}> {
  const admin = createAdminClient()
  const stats = emptyStats(segment)

  let query = admin
    .from('user_profiles')
    .select('id, role, is_active, created_at, company_id')
    .in('role', ADMIN_SEGMENT_ROLES)
    .eq('is_active', true)

  if (segment === 'new_admins') {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    query = query.gte('created_at', sevenDaysAgo)
  }

  const { data: profiles, error } = await query
  if (error) {
    stats.profilesQueryError = error.message
    logger.error('communications: failed to fetch profiles', { error: error.message, segment })
    return { recipients: [], stats, sampleCompanyIds: [] }
  }

  const rows = (profiles ?? []) as ProfileRow[]
  stats.profilesMatched = rows.length
  const sampleCompanyIds = rows.map((p) => p.company_id).filter(Boolean) as string[]

  if (rows.length === 0) {
    logger.info('communications: audience resolved (empty segment)', { ...stats })
    return { recipients: [], stats, sampleCompanyIds: [] }
  }

  const profileIds = rows.map((p) => p.id)
  const { map: emailMap, usersLoaded, failed, errorMessage } = await resolveAuthEmailsForProfileIds(
    admin,
    profileIds
  )
  stats.authUsersLoaded = usersLoaded
  stats.listUsersFailed = failed
  stats.listUsersError = errorMessage

  const recipients: CampaignRecipient[] = []
  const seen = new Set<string>()
  for (const p of rows) {
    const email = emailMap.get(p.id)
    if (!email) {
      stats.skippedNoEmail += 1
      continue
    }
    if (seen.has(email)) {
      stats.skippedDuplicateEmail += 1
      continue
    }
    seen.add(email)
    recipients.push({ id: p.id, email })
  }
  stats.recipientsResolved = recipients.length

  logger.info('communications: audience resolved', { ...stats })

  return { recipients, stats, sampleCompanyIds }
}

/** Builds a safe preview payload (no emails) for the super-admin UI. */
export async function previewAudience(segment: CommSegment): Promise<AudiencePreview> {
  const admin = createAdminClient()
  const { stats, sampleCompanyIds } = await resolveAudienceDetailed(segment)
  const sampleCompanies = await fetchSampleCompanyNames(admin, sampleCompanyIds)
  const warnings = buildPreviewWarnings(stats)

  return {
    segment,
    recipientCount: stats.recipientsResolved,
    profilesMatched: stats.profilesMatched,
    skippedNoEmail: stats.skippedNoEmail,
    warnings,
    sampleCompanies,
    ready: stats.recipientsResolved > 0 && warnings.length === 0,
  }
}

/**
 * Resolves the recipient audience for a segment. Returns unique {id, email}.
 * - active_admins: active admin-role profiles.
 * - new_admins: admin-role profiles created in the last 7 days.
 */
export async function resolveAudience(segment: CommSegment): Promise<CampaignRecipient[]> {
  const { recipients, stats } = await resolveAudienceDetailed(segment)
  assertAudienceResolvable(stats)
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
 * Dispatches scheduled campaigns whose time has arrived. Used by the daily cron
 * (07:00 America/Tegucigalpa). Flips status to 'sending' first (guard against
 * concurrent runs), resolves the audience and sends.
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
      let recipients: CampaignRecipient[]
      try {
        recipients = await resolveAudience(segment)
      } catch (audienceErr) {
        result.errors += 1
        logger.error('communications dispatch: audience resolution failed', {
          campaignId: c.id,
          segment,
          err: audienceErr,
        })
        await admin.from('communication_campaigns').update({ status: 'failed' }).eq('id', c.id)
        continue
      }

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
