import { NextApiRequest, NextApiResponse } from 'next'
import { requireSuperAdmin } from '../../../lib/auth/api-auth-fixed'
import { createAdminClient } from '../../../lib/supabase/server'
import { fetchSystemStats } from '../../../lib/admin/system-stats'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    await requireSuperAdmin(req, res)
    const supabase = createAdminClient()
    const stats = await fetchSystemStats(supabase)

    res.status(200).json({ stats })
  } catch (error) {
    console.error('Error fetching admin stats:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
