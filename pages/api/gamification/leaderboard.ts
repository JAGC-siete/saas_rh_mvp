import { NextApiRequest, NextApiResponse } from 'next'
import { createServerClient } from '@supabase/ssr'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Create Supabase client with cookies from request
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return req.cookies[name]
          },
          set() {},
          remove() {},
        },
      }
    )

    // Get user from auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Get user profile to verify company access
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile) {
      return res.status(403).json({ error: 'Access denied' })
    }

    const { company_id, limit = 20 } = req.query

    if (!company_id) {
      return res.status(400).json({ error: 'Company ID is required' })
    }

    // Verify user has access to this company
    if (userProfile.company_id !== company_id && userProfile.role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied to this company' })
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
