import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../../../../lib/supabase/server'
import { logger } from '../../../../../../lib/logger'
import { fetchLeaveAttendanceSummaryForRequest } from '../../../../../../lib/leave/leave-attendance-summary'
import {
  assertEmployeePortalEnabled,
  resolveEmployeeAndCompanyId,
} from '../../../../../../lib/employee-portal/company-settings'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const rawId = req.query.id
  const id = typeof rawId === 'string' ? rawId : Array.isArray(rawId) ? rawId[0] : ''
  if (!id) {
    return res.status(400).json({ error: 'ID requerido' })
  }

  try {
    const supabase = createClient(req, res)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return res.status(401).json({ error: 'No autorizado' })
    }

    const ctx = await resolveEmployeeAndCompanyId(supabase, user)
    if (!ctx) {
      return res.status(401).json({ error: 'Datos de empleado no encontrados' })
    }
    if (!(await assertEmployeePortalEnabled(supabase, ctx.companyId, res))) {
      return
    }

    const result = await fetchLeaveAttendanceSummaryForRequest(
      supabase,
      id,
      ctx.employeeId
    )

    if (!result.ok) {
      return res.status(result.status).json({ error: result.error })
    }

    return res.status(200).json({ data: result.data })
  } catch (error) {
    logger.error('Employee leave attendance summary error', error)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}
