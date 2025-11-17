import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../../../lib/supabase/server'
import { logger } from '../../../../../lib/logger'
import { requireSuperAdmin } from '../../../../../lib/auth/api-auth-fixed'

interface ScoresResponse {
  success: boolean
  data?: any[]
  metadata?: {
    total: number
    page: number
    pageSize: number
    filters?: any
  }
  error?: string
  message?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ScoresResponse>
) {
  try {
    await requireSuperAdmin(req, res)

    if (req.method === 'GET') {
      return await getScores(req, res)
    }

    res.setHeader('Allow', ['GET'])
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      message: `Method ${req.method} not allowed`
    })
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'INSUFFICIENT_PERMISSIONS') {
      return
    }
    logger.error('Error in gamification scores admin API', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message || 'Failed to process request'
    })
  }
}

async function getScores(req: NextApiRequest, res: NextApiResponse<ScoresResponse>) {
  try {
    const adminClient = createAdminClient()

    const companyId = req.query.company_id as string | undefined
    const minPoints = req.query.min_points as string | undefined
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10))
    const pageSize = Math.min(100, Math.max(1, parseInt((req.query.pageSize as string) || '20', 10)))
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    // Base query with employee and company info
    let query = adminClient
      .from('employee_scores')
      .select(`
        id,
        employee_id,
        company_id,
        total_points,
        weekly_points,
        monthly_points,
        punctuality_streak,
        early_arrival_count,
        perfect_week_count,
        last_reset_date,
        created_at,
        updated_at,
        employees (
          id,
          name,
          employee_code,
          company_id,
          companies (
            id,
            name
          )
        )
      `, { count: 'exact' })

    // Apply filters
    if (companyId) {
      query = query.eq('company_id', companyId)
    }

    if (minPoints) {
      query = query.gte('total_points', parseInt(minPoints))
    }

    // Order by total points (leaderboard style)
    query = query.order('total_points', { ascending: false }).range(from, to)

    const { data: scores, error, count } = await query

    if (error) {
      throw error
    }

    // Get achievements count for each employee
    const employeeIds = scores?.map((s: any) => s.employee_id) || []
    const achievementsMap = new Map<string, number>()

    if (employeeIds.length > 0) {
      const { data: achievements } = await adminClient
        .from('employee_achievements')
        .select('employee_id')
        .in('employee_id', employeeIds)

      achievements?.forEach((ach: any) => {
        const count = achievementsMap.get(ach.employee_id) || 0
        achievementsMap.set(ach.employee_id, count + 1)
      })
    }

    // Format response
    const scoresFormatted = scores?.map((score: any, index: number) => ({
      id: score.id,
      employee_id: score.employee_id,
      employee_name: score.employees?.name || 'Unknown',
      employee_code: score.employees?.employee_code || '-',
      company_id: score.company_id,
      company_name: score.employees?.companies?.name || 'Unknown',
      total_points: score.total_points || 0,
      weekly_points: score.weekly_points || 0,
      monthly_points: score.monthly_points || 0,
      punctuality_streak: score.punctuality_streak || 0,
      early_arrival_count: score.early_arrival_count || 0,
      perfect_week_count: score.perfect_week_count || 0,
      achievements_count: achievementsMap.get(score.employee_id) || 0,
      rank: from + index + 1,
      last_reset_date: score.last_reset_date,
      created_at: score.created_at,
      updated_at: score.updated_at
    })) || []

    logger.info('Gamification scores retrieved', {
      count: scoresFormatted.length,
      total: count,
      filters: { companyId, minPoints }
    })

    return res.status(200).json({
      success: true,
      data: scoresFormatted,
      metadata: {
        total: count || 0,
        page,
        pageSize,
        filters: {
          company_id: companyId || null,
          min_points: minPoints || null
        }
      }
    })
  } catch (error) {
    logger.error('Error fetching gamification scores', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch gamification scores',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

