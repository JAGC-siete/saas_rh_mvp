import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../../lib/supabase/server'
import { logger } from '../../../../lib/logger'
import {
  assertEmployeePortalEnabled,
  resolveEmployeeAndCompanyId,
} from '../../../../lib/employee-portal/company-settings'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const supabase = createClient(req, res)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return res.status(401).json({ error: 'No autorizado' })
    }

    const ctx = await resolveEmployeeAndCompanyId(supabase, user)
    if (!ctx) {
      return res.status(401).json({ error: 'Datos de empleado no encontrados' })
    }
    if (!(await assertEmployeePortalEnabled(supabase, ctx.companyId, res))) return

    const { data, error } = await supabase
      .from('performance_evaluations')
      .select('id, cycle_start, cycle_end, status, overall_score, items, updated_at')
      .eq('employee_id', ctx.employeeId)
      .eq('company_id', ctx.companyId)
      .eq('status', 'completed')
      .order('cycle_end', { ascending: false })
      .limit(10)

    if (error) {
      logger.error('Failed to fetch employee performance evaluations', { error: error.message })
      return res.status(500).json({ error: 'Error al obtener evaluaciones' })
    }

    return res.status(200).json({ evaluations: data ?? [] })
  } catch (error) {
    logger.error('Employee performance evaluations API error', error)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}

