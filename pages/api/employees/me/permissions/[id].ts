import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../../../lib/supabase/server'
import { logger } from '../../../../../lib/logger'
import {
  assertEmployeePortalEnabled,
  resolveEmployeeAndCompanyId,
} from '../../../../../lib/employee-portal/company-settings'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH' && req.method !== 'DELETE') {
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
    const { employeeId } = ctx

    const { data: row, error: fetchError } = await supabase
      .from('leave_requests')
      .select('id, employee_id, status')
      .eq('id', id)
      .single()

    if (fetchError || !row) {
      return res.status(404).json({ error: 'Solicitud no encontrada' })
    }

    if (row.employee_id !== employeeId) {
      return res.status(403).json({ error: 'No autorizado' })
    }

    if (row.status !== 'pending') {
      return res.status(400).json({
        error: 'Solo se pueden cancelar solicitudes pendientes',
      })
    }

    if (req.method === 'DELETE' || req.method === 'PATCH') {
      const { data: updated, error: upError } = await supabase
        .from('leave_requests')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('employee_id', employeeId)
        .eq('status', 'pending')
        .select('id, status')
        .maybeSingle()

      if (upError || !updated) {
        logger.warn('Employee cancel leave failed', { id, employeeId, upError })
        return res.status(400).json({ error: 'No se pudo cancelar la solicitud' })
      }

      return res.status(200).json({ success: true, id: updated.id, status: updated.status })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    logger.error('Employee permission [id] API error', error)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}
