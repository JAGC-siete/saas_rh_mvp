import type { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from "../../../lib/auth/api-auth-fixed"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { supabase, companyId } = await requireCompanyAccess(req, res)
    const { run_id } = req.query

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' })
    }

    if (!run_id || typeof run_id !== 'string') {
      return res.status(400).json({ error: 'run_id es requerido' })
    }

    const { data: lines, error } = await supabase
      .from('payroll_run_lines')
      .select('id, employee_id, metadata, eff_neto, eff_bruto, eff_ihss, eff_rap, eff_isr, eff_hours, edited')
      .eq('run_id', run_id)
      .eq('company_id', companyId)

    if (error) {
      console.error('Error fetching run lines:', error)
      return res.status(500).json({ error: 'Error obteniendo líneas de nómina' })
    }

    return res.status(200).json({ run_id, lines: lines || [] })
  } catch (error: any) {
    console.error('run-lines API error:', error)
    return res.status(500).json({ error: error?.message || 'Internal server error' })
  }
}


