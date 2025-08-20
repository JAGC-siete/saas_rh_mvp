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
      .select('company_id, role, employee_id')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile) {
      return res.status(403).json({ error: 'Access denied' })
    }

    const { company_id, employee_id } = req.query

    if (!company_id || !employee_id) {
      return res.status(400).json({ error: 'Company ID and Employee ID are required' })
    }

    // Verify user has access to this company
    if (userProfile.company_id !== company_id && userProfile.role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied to this company' })
    }

    // Verify user can access this employee's data (own data or admin)
    if (userProfile.employee_id !== employee_id && 
        userProfile.role !== 'super_admin' && 
        userProfile.role !== 'company_admin') {
      return res.status(403).json({ error: 'Access denied to this employee data' })
    }

    // Fetch employee scores
    const { data: scores, error: scoresError } = await supabase
      .from('employee_scores')
      .select('*')
      .eq('company_id', company_id)
      .eq('employee_id', employee_id)
      .single()

    if (scoresError && scoresError.code !== 'PGRST116') {
      console.error('Scores fetch error:', scoresError)
      return res.status(500).json({ error: 'Failed to fetch employee scores' })
    }

    // Fetch employee achievements
    const { data: achievements, error: achievementsError } = await supabase
      .from('employee_achievements')
      .select(`
        *,
        achievement_type:achievement_types(*)
      `)
      .eq('company_id', company_id)
      .eq('employee_id', employee_id)

    if (achievementsError) {
      console.error('Achievements fetch error:', achievementsError)
      return res.status(500).json({ error: 'Failed to fetch employee achievements' })
    }

    // Fetch recent point history
    const { data: pointHistory, error: historyError } = await supabase
      .from('point_history')
      .select('*')
      .eq('company_id', company_id)
      .eq('employee_id', employee_id)
      .order('created_at', { ascending: false })
      .limit(10)

    if (historyError) {
      console.error('Point history fetch error:', historyError)
      return res.status(500).json({ error: 'Failed to fetch point history' })
    }

    // Calculate progress metrics
    const progress = {
      currentRank: 0, // Will be calculated if scores exist
      totalEmployees: 0,
      weeklyProgress: 0,
      monthlyProgress: 0
    }

    // If scores exist, calculate rank
    if (scores) {
      const { data: allScores } = await supabase
        .from('employee_scores')
        .select('total_points')
        .eq('company_id', company_id)
        .order('total_points', { ascending: false })

      if (allScores) {
        progress.totalEmployees = allScores.length
        progress.currentRank = allScores.findIndex(s => s.total_points <= scores.total_points) + 1
      }
    }

    res.status(200).json({
      success: true,
      data: {
        scores: scores || null,
        achievements: achievements || [],
        pointHistory: pointHistory || [],
        progress
      }
    })

  } catch (error) {
    console.error('Employee progress API error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
