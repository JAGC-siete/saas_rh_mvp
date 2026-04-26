import type { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from "../../../lib/auth/api-auth-fixed"
import { getDateRange } from '../../../lib/attendance'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { supabase, companyId } = await requireCompanyAccess(req, res)
    
    const { preset = 'today', from, to, role, employee_id, department_id } = req.query
    const range = typeof from === 'string' && typeof to === 'string'
      ? { from, to }
      : getDateRange(preset as string, undefined, typeof from === 'string' ? from : undefined, typeof to === 'string' ? to : undefined)
  
  const rpcArgs = {
    p_employee_id: (typeof employee_id === 'string' && employee_id.trim() !== '') ? employee_id.trim() : null,
    p_from: range.from,
    p_to: range.to,
    p_role: (typeof role === 'string' && role.trim() !== '') ? role : null,
    p_department_id: (typeof department_id === 'string' && department_id.trim() !== '') ? department_id.trim() : null,
    p_company_id: companyId
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
  } catch (error: any) {
    console.error('Attendance KPIs API error:', error)
    return res.status(error.message === 'UNAUTHORIZED' ? 401 : 500).json({ 
      error: error.message || 'Internal server error' 
    })
  }
}
