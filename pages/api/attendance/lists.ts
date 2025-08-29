import type { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../lib/supabase/server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { scope = 'today', type = 'absent', role, employee_id } = req.query
  const supabase = createAdminClient()
  
  // CORREGIR: Orden de parámetros según definición del RPC
  // attendance_lists_filtered(p_employee_id, p_scope, p_type, p_role)
  const rpcArgs = {
    p_employee_id: (employee_id as string) || null,
    p_scope: scope as string,
    p_type: type as string,
    p_role: (role as string) || null
  }

  console.log('RPC Args:', rpcArgs)

  // Llamar al nuevo RPC filtered con parámetros nombrados
  let { data, error } = await supabase.rpc('attendance_lists_filtered', rpcArgs)

  if (error) {
    console.error('attendance_lists_filtered error', error)
    return res.status(500).json({ error: error.message })
  }
  
  // Map RPC field team_out -> team to match UI expectation
  const mapped = Array.isArray(data)
    ? data.map((row: any) => ({ ...row, team: row.role ?? row.team_out ?? null }))
    : []
  res.status(200).json(mapped)
}
