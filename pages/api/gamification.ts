import { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../lib/auth/api-auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { supabase, companyId } = await requireCompanyAccess(req, res)
    
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' })
    }

    const { action, employee_id, limit = 20 } = req.query

    switch (action) {
      case 'leaderboard':
        return await handleLeaderboard(req, res, supabase, companyId, Number(limit))
      
      case 'achievements':
        return await handleAchievements(req, res, supabase, companyId, employee_id as string)
      
      case 'employee-progress':
        if (!employee_id) {
          return res.status(400).json({ error: 'Employee ID is required for progress' })
        }
        return await handleEmployeeProgress(req, res, supabase, companyId, employee_id as string)
      
      case 'stats':
        return await handleStats(req, res, supabase, companyId)
      
      default:
        return res.status(400).json({ error: 'Invalid action. Use: leaderboard, achievements, employee-progress, or stats' })
    }
  } catch (error: any) {
    console.error('Gamification API error:', error)
    return res.status(error.message === 'UNAUTHORIZED' ? 401 : 500).json({
      error: error.message || 'Internal server error'
    })
  }
}

async function handleLeaderboard(req: NextApiRequest, res: NextApiResponse, supabase: any, companyId: string, limit: number) {
  try {
    // First get employee scores
    const { data: scores, error: scoresError } = await supabase
      .from('employee_scores')
      .select('*')
      .eq('company_id', companyId)
      .order('total_points', { ascending: false })
      .limit(limit)

    if (scoresError) {
      console.error('Scores fetch error:', scoresError)
      return res.status(500).json({ error: 'Failed to fetch scores' })
    }

    if (!scores || scores.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        total: 0
      })
    }

    // Then get employee details separately to avoid complex joins
    const employeeIds = scores.map((score: any) => score.employee_id)
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('id, name, employee_code, department_id')
      .in('id', employeeIds)

    if (employeesError) {
      console.error('Employees fetch error:', employeesError)
      // Continue without employee details
    }

    // Get department names
    const departmentIds = employees?.map((emp: any) => emp.department_id).filter(Boolean) || []
    let departments: any[] = []
    if (departmentIds.length > 0) {
      const { data: deps } = await supabase
        .from('departments')
        .select('id, name')
        .in('id', departmentIds)
      departments = deps || []
    }

    // Combine the data
    const leaderboard = scores.map((score: any, index: number) => {
      const employee = employees?.find((emp: any) => emp.id === score.employee_id) || {}
      const department = departments?.find((dept: any) => dept.id === employee.department_id)
      
      return {
        ...score,
        rank: index + 1,
        employee: {
          id: employee.id,
          name: employee.name || `Employee ${employee.employee_code}`,
          employee_code: employee.employee_code,
          department: department ? { name: department.name } : null
        }
      }
    })

    res.status(200).json({
      success: true,
      data: leaderboard,
      total: leaderboard.length
    })
  } catch (error) {
    console.error('Leaderboard error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

async function handleAchievements(req: NextApiRequest, res: NextApiResponse, supabase: any, companyId: string, employeeId?: string) {
  try {
    // Build query for employee achievements
    let query = supabase
      .from('employee_achievements')
      .select('*')
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

    if (!achievements || achievements.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        total: 0
      })
    }

    // Get achievement types separately to avoid complex joins
    const achievementTypeIds = achievements.map((ach: any) => ach.achievement_type_id)
    const { data: achievementTypes, error: typesError } = await supabase
      .from('achievement_types')
      .select('*')
      .in('id', achievementTypeIds)

    if (typesError) {
      console.error('Achievement types fetch error:', typesError)
      // Continue without achievement type details
    }

    // Combine the data
    const enrichedAchievements = achievements.map((achievement: any) => {
      const achievementType = achievementTypes?.find((type: any) => type.id === achievement.achievement_type_id) || {}
      
      return {
        ...achievement,
        achievement_type: {
          id: achievementType.id,
          name: achievementType.name || 'Unknown Achievement',
          description: achievementType.description || '',
          icon: achievementType.icon || '🏆',
          points_reward: achievementType.points_reward || 0,
          badge_color: achievementType.badge_color || 'blue'
        }
      }
    })

    res.status(200).json({
      success: true,
      data: enrichedAchievements,
      total: enrichedAchievements.length
    })
  } catch (error) {
    console.error('Achievements error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
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
