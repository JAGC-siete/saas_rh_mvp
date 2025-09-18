import { NextApiRequest, NextApiResponse } from 'next'
import { logger } from '../../../lib/logger'
import { requireAdmin } from '../../../lib/auth/api-auth'
import { nowInHonduras } from '../../../lib/timezone'

interface LogsResponse {
  success: boolean
  message: string
  data?: any
  error?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LogsResponse>
) {
  try {
    // Use standardized admin authentication
    const { supabase, user } = await requireAdmin(req, res)
    
    logger.info('logs_api_access', { userId: user.id, method: req.method })

    // Solo permitir GET para logs
    if (req.method !== 'GET') {
      res.setHeader('Allow', ['GET'])
      return res.status(405).json({
        success: false,
        message: 'Method not allowed',
        error: `Method ${req.method} not allowed`
      })
    }

    const { level, limit = 100, startDate, endDate } = req.query

    // Obtener logs desde Supabase (asumiendo que tienes una tabla de logs)
    
    let query = supabase
      .from('system_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit as string))

    // Filtrar por nivel si se especifica
    if (level && typeof level === 'string') {
      query = query.eq('level', level)
    }

    // Filtrar por fecha si se especifica
    if (startDate && typeof startDate === 'string') {
      query = query.gte('created_at', startDate)
    }

    if (endDate && typeof endDate === 'string') {
      query = query.lte('created_at', endDate)
    }

    const { data: logs, error } = await query

    if (error) {
      logger.error('Error fetching logs from database', { error })
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch logs',
        error: error.message
      })
    }

    // Obtener estadísticas de logs
    const { data: stats, error: statsError } = await supabase
      .from('system_logs')
      .select('level')
      .gte('created_at', new Date(nowInHonduras().getTime() - 24 * 60 * 60 * 1000).toISOString()) // Últimas 24 horas

    if (statsError) {
      logger.error('Error fetching log statistics', { error: statsError })
    }

    // Calcular estadísticas
    const levelStats = stats?.reduce((acc: any, log: any) => {
      acc[log.level] = (acc[log.level] || 0) + 1
      return acc
    }, {}) || {}

    logger.info('Logs accessed', { 
      userId: user?.id, 
      filters: { level, limit, startDate, endDate },
      resultsCount: logs?.length || 0 
    })

    return res.status(200).json({
      success: true,
      message: 'Logs retrieved successfully',
      data: {
        logs: logs || [],
        statistics: {
          total: logs?.length || 0,
          last24Hours: levelStats,
          filters: {
            level,
            limit,
            startDate,
            endDate
          }
        }
      }
    })

  } catch (error: any) {
    logger.error('Error in logs API', { error })
    
    // Handle specific authentication errors
    if (error.message === 'UNAUTHORIZED') {
      return res.status(401).json({ 
        success: false,
        message: 'Unauthorized',
        error: 'Authentication required'
      })
    }
    if (error.message === 'ADMIN_REQUIRED') {
      return res.status(403).json({ 
        success: false,
        message: 'Forbidden',
        error: 'Admin privileges required'
      })
    }
    
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve logs',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
} 