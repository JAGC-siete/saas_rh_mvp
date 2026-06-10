import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { logger } from '../logger'
import {
  getWatchWindowKey,
  isMoreSpecificSource,
  normalizeLeadSource,
  SEQUENCE_COMPLETE_STEP,
  SEQUENCE_CONTENT,
  SEQUENCE_STEP,
  WATCHMAN_FIRST_STEP,
} from './email-sequence-ledger'
import { isMarketingExcluded } from './is-marketing-excluded'
import { sendInfoPackEmail } from './info-pack-email'
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
  fullName?: string | null
  phone?: string | null
  supabase?: SupabaseClient
}

export type EnrollMarketingLeadResult = {
  leadId: string | null
  welcomeSent: boolean
  /** /info: informational pack sent (sequence welcome follows after delay). */
  infoPackSent?: boolean
  skippedReason?: 'excluded' | 'completed'
}

function isInfoLeadSource(source: string): boolean {
  return normalizeLeadSource(source) === 'info'
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

function buildContactPatch(input: EnrollMarketingLeadInput): Record<string, string> {
  const patch: Record<string, string> = {}
  const fullName = typeof input.fullName === 'string' ? input.fullName.trim() : ''
  const phone = typeof input.phone === 'string' ? input.phone.trim() : ''
  if (fullName) patch.full_name = fullName
  if (phone) patch.phone = phone
  return patch
}

async function applyContactPatch(
  client: SupabaseClient,
  leadId: string,
  patch: Record<string, string>
): Promise<void> {
  if (Object.keys(patch).length === 0) return
  const { error } = await client.from('marketing_leads').update(patch).eq('id', leadId)
  if (error) {
    logger.warn('Could not update marketing lead contact fields', {
      leadId,
      error: error.message,
    })
  }
}

export async function enrollMarketingLead(
  input: EnrollMarketingLeadInput
): Promise<EnrollMarketingLeadResult> {
  const client = input.supabase ?? supabaseAdmin
  const trimmedEmail = input.email.trim().toLowerCase()
  const source = input.source.trim() || 'suscripcion-page'
  const now = new Date()
  const welcomeContent = SEQUENCE_CONTENT[SEQUENCE_STEP.WELCOME]
  const contactPatch = buildContactPatch(input)

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
        ...contactPatch,
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
        ...contactPatch,
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

    await applyContactPatch(client, existing.id, contactPatch)

    if (existing.current_step <= SEQUENCE_STEP.WELCOME) {
      shouldSendWelcome = !(await hasWelcomeInLedger(client, existing.id))
    }
  }

  let welcomeSent = false
  let infoPackSent = false

  if (shouldSendWelcome) {
    try {
      if (isInfoLeadSource(source)) {
        const { data: infoState } = await client
          .from('marketing_leads')
          .select('info_pack_sent_at')
          .eq('id', lead.id)
          .maybeSingle()

        if (infoState?.info_pack_sent_at) {
          logger.info('Info pack already sent; skipping duplicate', { email: trimmedEmail })
        } else {
          const displayName =
            contactPatch.full_name ||
            (typeof input.fullName === 'string' ? input.fullName.trim() : '') ||
            undefined

          await sendInfoPackEmail({
            to: trimmedEmail,
            nombre: displayName,
            unsubscribeToken: lead.unsubscribe_token,
          })

          await client
            .from('marketing_leads')
            .update({
              info_pack_sent_at: now.toISOString(),
              last_mail_sent_at: now.toISOString(),
              current_step: SEQUENCE_STEP.WELCOME,
            })
            .eq('id', lead.id)

          infoPackSent = true
          welcomeSent = true
        }
      } else {
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
      }
    } catch (emailError: unknown) {
      const message = emailError instanceof Error ? emailError.message : 'Unknown error'
      logger.warn('Welcome email failed to send, but lead was captured', {
        email: trimmedEmail,
        source,
        error: message,
      })
    }
  }

  return { leadId: lead.id, welcomeSent, infoPackSent: infoPackSent || undefined }
}
