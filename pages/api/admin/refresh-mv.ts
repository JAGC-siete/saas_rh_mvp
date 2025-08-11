import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../lib/supabase/server'
import { logger } from '../../../lib/logger'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Verificar autenticación de admin
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const supabase = createAdminClient()

    // Verificar que el usuario sea admin
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    // Verificar rol de admin
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return res.status(403).json({ error: 'User profile not found' })
    }

    if (!['super_admin', 'company_admin', 'hr_manager'].includes(profile.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }

    logger.info('Starting materialized view refresh', { userId: user.id, role: profile.role })

    // Refrescar todas las vistas materializadas de asistencia
    const views = [
      'mv_attendance_daily',
      'mv_attendance_weekly', 
      'mv_attendance_quincenal',
      'mv_attendance_mensual',
      'mv_punctuality_ranking'
    ]

    const results = []
    
    for (const view of views) {
      try {
        const { error } = await supabase.rpc('refresh_materialized_view', { view_name: view })
        
        if (error) {
          logger.error(`Error refreshing view ${view}`, error)
          results.push({ view, status: 'error', message: error.message })
        } else {
          logger.info(`Successfully refreshed view ${view}`)
          results.push({ view, status: 'success' })
        }
      } catch (err) {
        logger.error(`Exception refreshing view ${view}`, err)
        results.push({ view, status: 'error', message: 'Exception occurred' })
      }
    }

    // Verificar si hay errores
    const errors = results.filter(r => r.status === 'error')
    const successCount = results.filter(r => r.status === 'success').length

    if (errors.length > 0) {
      logger.warn('Some views failed to refresh', { errors, successCount })
      return res.status(207).json({ // 207 Multi-Status
        message: `Refreshed ${successCount}/${views.length} views`,
        results,
        hasErrors: true
      })
    }

    logger.info('All materialized views refreshed successfully')
    return res.status(200).json({
      message: 'All materialized views refreshed successfully',
      results,
      hasErrors: false
    })

  } catch (error) {
    logger.error('Unexpected error in refresh-mv', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
