import type { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../lib/supabase/server'
import { getDateRange } from '../../../lib/attendance'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { preset = 'today', from, to, role, employee_id } = req.query
  const range = typeof from === 'string' && typeof to === 'string'
    ? { from, to }
    : getDateRange(preset as string)

  const supabase = createAdminClient()
  
  // CORREGIR: Orden de parámetros según definición del RPC
  // attendance_kpis_filtered(p_employee_id, p_from, p_role, p_to)
  const rpcArgs = {
    p_employee_id: (typeof employee_id === 'string' && employee_id.trim() !== '') ? employee_id.trim() : null,
    p_from: range.from,
    p_role: (typeof role === 'string' && role.trim() !== '') ? role : null,
    p_to: range.to
  }

  console.log('RPC Args:', rpcArgs)

  // Llamar al nuevo RPC filtered con parámetros nombrados
  let { data, error } = await supabase.rpc('attendance_kpis_filtered', rpcArgs)

  if (error) {
    console.error('attendance_kpis_filtered error', error)
    return res.status(500).json({ error: error.message })
  }

  // RPC puede devolver row único en array
  const row = Array.isArray(data) ? (data[0] || null) : data
  res.status(200).json(row)
}
