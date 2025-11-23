import { NextApiRequest, NextApiResponse } from 'next'
import { authenticateUser } from '../../../lib/auth/api-auth-fixed'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    const { supabase, user } = await authenticateUser(req, res, { requireProfile: true })

    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10))
    const pageSize = 10
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    // First, get the affiliate ID for the current user
    const { data: affiliate, error: affiliateError } = await supabase
      .from('affiliates')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (affiliateError || !affiliate) {
      // If not an affiliate, return empty list
      return res.status(200).json({ commissions: [], metadata: { total: 0, page, pageSize } })
    }

    // Fetch commissions with referred company name
    const { data, error, count } = await supabase
      .from('commissions')
      .select(`
        id,
        created_at,
        amount,
        status,
        companies (
          name
        )
      `, { count: 'exact' })
      .eq('affiliate_id', affiliate.id)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) {
      throw error
    }

    const commissions = (data || []).map((c: any) => ({
      id: c.id,
      created_at: c.created_at,
      amount: c.amount,
      status: c.status,
      referred_company_name: c.companies?.name || 'N/A',
    }))

    res.status(200).json({
      commissions,
      metadata: {
        total: count || 0,
        page,
        pageSize,
      },
    })

  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'PROFILE_REQUIRED') {
      return // Response already sent
    }
    console.error('Error fetching commissions list:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
