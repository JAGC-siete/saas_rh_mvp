import { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../lib/auth/api-auth-fixed'
import { createAdminClient } from '../../../lib/supabase/server'
import { resolveSettingsAccessFromProfile } from '../../../lib/security/settings-access'

const SCHEDULE_WRITE_FIELDS = [
  'name',
  'monday_start',
  'monday_end',
  'tuesday_start',
  'tuesday_end',
  'wednesday_start',
  'wednesday_end',
  'thursday_start',
  'thursday_end',
  'friday_start',
  'friday_end',
  'saturday_start',
  'saturday_end',
  'sunday_start',
  'sunday_end',
  'break_duration',
  'timezone',
  'shift_config',
  'day_off_mask',
  'late_grace_minutes',
  'late_absent_minutes',
  'early_grace_minutes',
  'early_absent_minutes',
] as const

function pickScheduleBody(body: Record<string, unknown>) {
  const out: Record<string, unknown> = {}
  for (const key of SCHEDULE_WRITE_FIELDS) {
    if (key in body) out[key] = body[key]
  }
  return out
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { supabase, companyId, userProfile } = await requireCompanyAccess(req, res)
    const settingsAccess = resolveSettingsAccessFromProfile(userProfile)

    if (!companyId) {
      if (req.method === 'GET') {
        return res.status(200).json({ schedules: [], totalSchedules: 0 })
      }
      return res.status(400).json({ error: 'Company ID is required' })
    }

    if (req.method === 'GET') {
      const { data: schedules, error: schedError } = await supabase
        .from('work_schedules')
        .select('id, name')
        .eq('company_id', companyId)
        .order('name')

      if (schedError) {
        console.error('Error fetching work schedules:', schedError)
        return res.status(500).json({
          error: 'Error fetching work schedules',
          details: schedError.message,
        })
      }

      return res.status(200).json({
        schedules: schedules || [],
        totalSchedules: schedules?.length || 0,
      })
    }

    if (req.method === 'POST') {
      if (!settingsAccess.canCreateWorkSchedules) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          message: 'No tiene permiso para crear horarios',
        })
      }

      const body = (req.body || {}) as Record<string, unknown>
      const name = typeof body.name === 'string' ? body.name.trim() : ''
      if (!name) {
        return res.status(400).json({ error: 'Schedule name is required' })
      }

      const insertData = {
        ...pickScheduleBody(body),
        name,
        company_id: companyId,
      }

      const db = createAdminClient()
      const { data: created, error: insertError } = await db
        .from('work_schedules')
        .insert([insertData])
        .select('*')
        .single()

      if (insertError) {
        console.error('Error creating work schedule:', insertError)
        return res.status(500).json({
          error: 'Error creating work schedule',
          details: insertError.message,
        })
      }

      return res.status(201).json({ schedule: created })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    if (res.headersSent) return

    console.error('Work Schedules API error:', error)
    const msg = error instanceof Error ? error.message : ''

    if (msg === 'UNAUTHORIZED') {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    if (
      msg === 'PROFILE_REQUIRED' ||
      msg === 'ACCOUNT_DEACTIVATED' ||
      msg === 'INSUFFICIENT_PERMISSIONS' ||
      msg === 'COMPANY_ACCESS_REQUIRED'
    ) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    return res.status(500).json({ error: 'Internal server error' })
  }
}
