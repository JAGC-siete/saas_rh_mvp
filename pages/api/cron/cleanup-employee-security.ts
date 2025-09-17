import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../lib/supabase/server'
import { logger } from '../../../lib/logger'

/**
 * Cron job para limpiar datos de seguridad expirados
 * Debe ejecutarse diariamente para mantener la base de datos limpia
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Solo permitir POST (para evitar ejecución accidental via GET)
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Verificar que sea una llamada de cron autorizada
  const cronSecret = req.headers['x-cron-secret']
  const expectedSecret = process.env.CRON_SECRET

  if (!expectedSecret || cronSecret !== expectedSecret) {
    logger.warn('Unauthorized cron cleanup attempt', {
      hasSecret: !!cronSecret,
      ip: req.headers['x-forwarded-for'] || 'unknown'
    })
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const supabase = createAdminClient()

    logger.info('Starting employee security cleanup')

    // Ejecutar función de limpieza
    const { data: cleanupResult, error: cleanupError } = await supabase
      .rpc('cleanup_expired_employee_data')
      .single()

    if (cleanupError) {
      logger.error('Employee security cleanup failed', cleanupError)
      return res.status(500).json({
        error: 'Cleanup failed',
        details: cleanupError.message
      })
    }

    const {
      sessions_deleted = 0,
      logs_deleted = 0,
      attempts_deleted = 0
    } = (cleanupResult as any) || {}

    logger.info('Employee security cleanup completed', {
      sessionsDeleted: sessions_deleted,
      logsDeleted: logs_deleted,
      attemptsDeleted: attempts_deleted,
      totalDeleted: sessions_deleted + logs_deleted + attempts_deleted
    })

    // Opcional: Verificar estado de la base de datos después del cleanup
    const { data: stats, error: statsError } = await supabase
      .from('employee_auth_sessions')
      .select('count(*)', { count: 'exact' })

    let activeSessionsCount = 0
    if (!statsError && stats) {
      activeSessionsCount = stats.length
    }

    return res.status(200).json({
      success: true,
      cleanup: {
        sessionsDeleted: sessions_deleted,
        logsDeleted: logs_deleted,
        attemptsDeleted: attempts_deleted,
        totalDeleted: sessions_deleted + logs_deleted + attempts_deleted
      },
      stats: {
        activeSessionsRemaining: activeSessionsCount
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    logger.error('Employee security cleanup unexpected error', error)
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
