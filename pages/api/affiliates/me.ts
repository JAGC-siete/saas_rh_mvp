import { NextApiRequest, NextApiResponse } from 'next'
import { authenticateUser } from '../../../lib/auth/api-auth-fixed'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    const { supabase, user } = await authenticateUser(req, res, { requireProfile: true })

    const { data: affiliate, error } = await supabase
      .from('affiliates')
      .select('status, referral_code')
      .eq('user_id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') { // PostgREST error for no rows found
        return res.status(200).json({ status: 'none' })
      }
      throw error
    }

    if (!affiliate) {
      return res.status(200).json({ status: 'none' })
    }

    res.status(200).json(affiliate)

  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'PROFILE_REQUIRED') {
      return // Response already sent
    }
    console.error('Error fetching affiliate data:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

