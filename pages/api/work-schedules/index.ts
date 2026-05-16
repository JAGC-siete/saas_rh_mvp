import { NextApiRequest, NextApiResponse } from 'next'
import { authenticateUser } from '../../../lib/auth/api-auth-fixed'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { supabase, companyId } = await authenticateUser(req, res, {
      requireProfile: true,
      allowSuperAdminWithoutCompany: true,
    })

    if (!companyId) {
      if (!res.headersSent) {
        return res.status(200).json({ schedules: [], totalSchedules: 0 })
      }
      return
    }

    const { data: schedules, error: schedError } = await supabase
      .from('work_schedules')
      .select('id, name')
      .eq('company_id', companyId)
      .order('name')

    if (schedError) {
      console.error('❌ Error fetching work schedules:', schedError)
      return res.status(500).json({ error: 'Error fetching work schedules', details: schedError.message })
    }

    return res.status(200).json({
      schedules: schedules || [],
      totalSchedules: schedules?.length || 0,
    })
  } catch (error) {
    if (res.headersSent) return

    console.error('Work Schedules API error:', error)

    const msg = error instanceof Error ? error.message : ''

    if (msg === 'UNAUTHORIZED') {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    if (msg === 'PROFILE_REQUIRED' || msg === 'ACCOUNT_DEACTIVATED' || msg === 'INSUFFICIENT_PERMISSIONS') {
      return res.status(403).json({ error: 'Forbidden' })
    }

    return res.status(500).json({ error: 'Internal server error' })
  }
}
