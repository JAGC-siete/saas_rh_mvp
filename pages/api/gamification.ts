import { NextApiRequest, NextApiResponse } from 'next'
import { createServerClient } from '@supabase/ssr'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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

  const { company_id, action, employee_id, limit = 20 } = req.query

  if (!company_id) {
    return res.status(400).json({ error: 'Company ID is required' })
  }

  // Verify user has access to this company
  if (userProfile.company_id !== company_id && userProfile.role !== 'super_admin') {
    return res.status(403).json({ error: 'Access denied to this company' })
  }

  try {
    switch (action) {
      case 'leaderboard':
        return await handleLeaderboard(req, res, supabase, company_id as string, Number(limit))
      
      case 'achievements':
        return await handleAchievements(req, res, supabase, company_id as string, employee_id as string)
      
      case 'employee-progress':
        if (!employee_id) {
          return res.status(400).json({ error: 'Employee ID is required for progress' })
        }
        // Verify user can access this employee's data (own data or admin)
        if (userProfile.employee_id !== employee_id && 
            userProfile.role !== 'super_admin' && 
            userProfile.role !== 'company_admin') {
          return res.status(403).json({ error: 'Access denied to this employee data' })
        }
        return await handleEmployeeProgress(req, res, supabase, company_id as string, employee_id as string)
      
      case 'stats':
        return await handleStats(req, res, supabase, company_id as string)
      
      default:
        return res.status(400).json({ error: 'Invalid action. Use: leaderboard, achievements, employee-progress, or stats' })
    }
  } catch (error) {
    console.error('Gamification API error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

async function handleLeaderboard(req: NextApiRequest, res: NextApiResponse, supabase: any, companyId: string, limit: number) {
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
    .eq('company_id', companyId)
    .order('total_points', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Leaderboard fetch error:', error)
    return res.status(500).json({ error: 'Failed to fetch leaderboard' })
  }

  // Add rankings
  const rankedLeaderboard = leaderboard?.map((entry: any, index: number) => ({
    ...entry,
    rank: index + 1,
    employee: entry.employee || {}
  })) || []

  res.status(200).json({
    success: true,
    data: rankedLeaderboard,
    total: rankedLeaderboard.length
  })
}

async function handleAchievements(req: NextApiRequest, res: NextApiResponse, supabase: any, companyId: string, employeeId?: string) {
  let query = supabase
    .from('employee_achievements')
    .select(`
      *,
      achievement_type:achievement_types(*)
    `)
    .eq('company_id', companyId)

  // If employee_id is provided, filter by specific employee
  if (employeeId) {
    query = query.eq('employee_id', employeeId)
  }

  const { data: achievements, error } = await query

  if (error) {
    console.error('Achievements fetch error:', error)
    return res.status(500).json({ error: 'Failed to fetch achievements' })
  }

  res.status(200).json({
    success: true,
    data: achievements || [],
    total: achievements?.length || 0
  })
}

async function handleEmployeeProgress(req: NextApiRequest, res: NextApiResponse, supabase: any, companyId: string, employeeId: string) {
  // Fetch employee scores
  const { data: scores, error: scoresError } = await supabase
    .from('employee_scores')
    .select('*')
    .eq('company_id', companyId)
    .eq('employee_id', employeeId)
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
    .eq('company_id', companyId)
    .eq('employee_id', employeeId)

  if (achievementsError) {
    console.error('Achievements fetch error:', achievementsError)
    return res.status(500).json({ error: 'Failed to fetch employee achievements' })
  }

  // Fetch recent point history
  const { data: pointHistory, error: historyError } = await supabase
    .from('point_history')
    .select('*')
    .eq('company_id', companyId)
    .eq('employee_id', employeeId)
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
      .eq('company_id', companyId)
      .order('total_points', { ascending: false })

    if (allScores) {
      progress.totalEmployees = allScores.length
      progress.currentRank = allScores.findIndex((s: any) => s.total_points <= scores.total_points) + 1
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
}

async function handleStats(req: NextApiRequest, res: NextApiResponse, supabase: any, companyId: string) {
  // Fetch basic stats
  const [leaderboardResponse, achievementsResponse] = await Promise.all([
    supabase
      .from('employee_scores')
      .select('total_points')
      .eq('company_id', companyId)
      .order('total_points', { ascending: false }),
    supabase
      .from('employee_achievements')
      .select('id')
      .eq('company_id', companyId)
  ])

  if (leaderboardResponse.error) {
    console.error('Stats fetch error:', leaderboardResponse.error)
    return res.status(500).json({ error: 'Failed to fetch stats' })
  }

  if (achievementsResponse.error) {
    console.error('Stats fetch error:', achievementsResponse.error)
    return res.status(500).json({ error: 'Failed to fetch stats' })
  }

  const scores = leaderboardResponse.data || []
  const achievements = achievementsResponse.data || []

  const totalPoints = scores.reduce((sum: number, score: any) => sum + score.total_points, 0)
  const topScore = scores.length > 0 ? Math.max(...scores.map((s: any) => s.total_points)) : 0
  const averageScore = scores.length > 0 ? totalPoints / scores.length : 0

  res.status(200).json({
    success: true,
    data: {
      totalPoints,
      totalAchievements: achievements.length,
      activeEmployees: scores.length,
      topScore,
      averageScore
    }
  })
}
