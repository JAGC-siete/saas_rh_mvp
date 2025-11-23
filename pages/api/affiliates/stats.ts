import { NextApiRequest, NextApiResponse } from 'next'
import { authenticateUser } from '../../../lib/auth/api-auth-fixed'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    const { supabase, user } = await authenticateUser(req, res, { requireProfile: true })

    // First, get the affiliate ID for the current user
    const { data: affiliate, error: affiliateError } = await supabase
      .from('affiliates')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (affiliateError || !affiliate) {
      // If not an affiliate, return zeroed stats
      return res.status(200).json({ total_earned: 0, total_pending: 0, total_paid: 0 })
    }

    // Fetch all commissions for this affiliate
    const { data: commissions, error: commissionsError } = await supabase
      .from('commissions')
      .select('amount, status')
      .eq('affiliate_id', affiliate.id)

    if (commissionsError) {
      throw commissionsError
    }

    // Calculate stats
    const stats = (commissions || []).reduce((acc: { total_paid: number; total_pending: number }, commission: { amount: number; status: string }) => {
      if (commission.status === 'paid') {
        acc.total_paid += commission.amount
      } else if (commission.status === 'pending') {
        acc.total_pending += commission.amount
      }
      return acc
    }, { total_paid: 0, total_pending: 0 })

    const total_earned = stats.total_paid + stats.total_pending

    res.status(200).json({
      total_earned,
      total_pending: stats.total_pending,
      total_paid: stats.total_paid,
    })

  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'PROFILE_REQUIRED') {
      return // Response already sent
    }
    console.error('Error fetching commission stats:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
