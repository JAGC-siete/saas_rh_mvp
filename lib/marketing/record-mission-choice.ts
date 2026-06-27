import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { logger } from '../logger'
import { isValidMissionChoice, type MissionId } from './mission-config'

export type RecordMissionChoiceInput = {
  missionId: MissionId
  leadToken: string
  choice: string
  supabase?: SupabaseClient
}

export type RecordMissionChoiceResult =
  | {
      ok: true
      leadId: string
      firstName: string | null
      email: string
      alreadyRecorded: boolean
    }
  | { ok: false; reason: 'invalid_choice' | 'lead_not_found' | 'db_error' }

function firstNameFromLead(fullName: string | null, email: string): string {
  const name = typeof fullName === 'string' ? fullName.trim() : ''
  if (name) return name.split(/\s+/)[0] || name
  return email.split('@')[0] || 'Curioso'
}

export async function recordMissionChoice(
  input: RecordMissionChoiceInput
): Promise<RecordMissionChoiceResult> {
  const { missionId, leadToken, choice } = input

  if (!isValidMissionChoice(missionId, choice)) {
    return { ok: false, reason: 'invalid_choice' }
  }

  const client =
    input.supabase ??
    createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data: lead, error: leadError } = await client
    .from('marketing_leads')
    .select('id, email, full_name, status')
    .eq('unsubscribe_token', leadToken.trim())
    .maybeSingle()

  if (leadError) {
    logger.error('Mission choice: lead lookup failed', { error: leadError.message, missionId })
    return { ok: false, reason: 'db_error' }
  }

  if (!lead || lead.status === 'unsubscribed') {
    return { ok: false, reason: 'lead_not_found' }
  }

  const { data: existing } = await client
    .from('marketing_mission_events')
    .select('id')
    .eq('lead_id', lead.id)
    .eq('mission_id', missionId)
    .maybeSingle()

  if (existing) {
    return {
      ok: true,
      leadId: lead.id,
      firstName: firstNameFromLead(lead.full_name, lead.email),
      email: lead.email,
      alreadyRecorded: true,
    }
  }

  const { error: insertError } = await client.from('marketing_mission_events').insert({
    lead_id: lead.id,
    mission_id: missionId,
    choice,
  })

  if (insertError) {
    logger.error('Mission choice: insert failed', {
      error: insertError.message,
      missionId,
      leadId: lead.id,
    })
    return { ok: false, reason: 'db_error' }
  }

  logger.info('Mission choice recorded', { missionId, choice, leadId: lead.id })

  return {
    ok: true,
    leadId: lead.id,
    firstName: firstNameFromLead(lead.full_name, lead.email),
    email: lead.email,
    alreadyRecorded: false,
  }
}
