import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { company_id, limit = 20 } = req.query

    if (!company_id) {
      return res.status(400).json({ error: 'Company ID is required' })
    }

    // Fetch leaderboard data with employee details
    const { data: leaderboard, error } = await supabase
      .from('employee_scores')
      .select(`
        *,
        employee:employees(
          id,
          name,
          employee_code,
          department:departments(name)
        )
      `)
      .eq('company_id', company_id)
      .order('total_points', { ascending: false })
      .limit(Number(limit))

    if (error) {
      console.error('Leaderboard fetch error:', error)
      return res.status(500).json({ error: 'Failed to fetch leaderboard' })
    }

    // Add rankings
    const rankedLeaderboard = leaderboard?.map((entry, index) => ({
      ...entry,
      rank: index + 1,
      employee: entry.employee || {}
    })) || []

    res.status(200).json({
      success: true,
      data: rankedLeaderboard,
      total: rankedLeaderboard.length
    })

  } catch (error) {
    console.error('Leaderboard API error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
