/**
 * API: Trigger attendance hours calculation for a date (on-demand)
 * Called when admin opens attendance review screen or manually requests recalculation.
 * NOT called on each webhook - only cron (daily) or this endpoint.
 */

import { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../lib/auth/api-auth-fixed'
import { calculateAttendanceHoursForDate } from '../../../lib/attendance/calculate-hours'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { supabase, companyId, role } = await requireCompanyAccess(req, res)
    if (!['super_admin', 'company_admin', 'hr_manager'].includes(role)) {
      return res.status(403).json({ error: 'Permisos insuficientes' })
    }
    if (!companyId) {
      return res.status(400).json({ error: 'company_id requerido' })
    }

    const { date } = req.body || {}
    const targetDate = date || new Date().toISOString().split('T')[0]
    if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      return res.status(400).json({ error: 'Formato de fecha inválido (YYYY-MM-DD)' })
    }

    // Get employee IDs for this company
    const { data: employees } = await supabase
      .from('employees')
      .select('id')
      .eq('company_id', companyId)
    const employeeIds = (employees || []).map((e: any) => e.id)
    if (employeeIds.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No hay empleados',
        calculated: 0,
        date: targetDate
      })
    }

    // Get record IDs for this company's employees only
    const { data: records } = await supabase
      .from('attendance_records')
      .select('id')
      .eq('date', targetDate)
      .not('check_in', 'is', null)
      .not('check_out', 'is', null)
      .in('employee_id', employeeIds)

    const recordIds = (records || []).map((r: any) => r.id)
    if (recordIds.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No hay registros para calcular',
        calculated: 0,
        date: targetDate
      })
    }

    const { data: results } = await supabase.rpc('calculate_attendance_hours_batch', {
      p_record_ids: recordIds,
      p_law_year: new Date(targetDate).getFullYear()
    })

    return res.status(200).json({
      success: true,
      message: 'Cálculo completado',
      calculated: (results || []).length,
      date: targetDate
    })
  } catch (error) {
    console.error('Error calculating attendance hours:', error)
    return res.status(500).json({
      error: 'Error al calcular horas',
      message: error instanceof Error ? error.message : 'Error desconocido'
    })
  }
}
