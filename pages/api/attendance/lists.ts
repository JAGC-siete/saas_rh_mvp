import type { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../lib/auth/api-auth'
import { getDateRange } from '../../../lib/attendance'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { supabase, companyId } = await requireCompanyAccess(req, res)
    
    const { preset = 'today', type = 'absent', role, employee_id, from, to } = req.query
  
  // Use standardized preset parameter (remove scope compatibility)
  const finalPreset = preset
  
  // Calcular fechas igual que KPIs para sincronización
  const range = typeof from === 'string' && typeof to === 'string'
    ? { from, to }
    : getDateRange(finalPreset as string)
  
  // Use standardized RPC parameters for consistency
  const rpcArgs = {
    p_employee_id: (typeof employee_id === 'string' && employee_id.trim() !== '') ? employee_id.trim() : null,
    p_from: range.from,
    p_to: range.to,
    p_type: type as string,
    p_role: (typeof role === 'string' && role.trim() !== '') ? role.trim() : null,
    p_company_id: companyId
  }

  console.log('Lists RPC Args:', rpcArgs)

  // Usar attendance_lists_filtered pero con fechas calculadas igual que KPIs
  let { data, error } = await supabase.rpc('attendance_lists_filtered', rpcArgs)

  if (error) {
    console.error('attendance_lists_filtered error', error)
    return res.status(500).json({ error: error.message })
  }
  
    // Map RPC field team_out -> team and check_in -> check_in_time to match UI expectation
    const mapped = Array.isArray(data)
      ? data.map((row: any) => ({ 
          ...row, 
          team: row.role ?? row.team_out ?? null,
          check_in_time: row.check_in, // Map check_in to check_in_time for UI compatibility
          delta_min: row.late_minutes || 0 // Map late_minutes to delta_min for UI compatibility
        }))
      : []
    res.status(200).json(mapped)
  } catch (error: any) {
    console.error('Attendance lists API error:', error)
    return res.status(error.message === 'UNAUTHORIZED' ? 401 : 500).json({ 
      error: error.message || 'Internal server error' 
    })
  }
}
