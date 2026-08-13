import type { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../lib/auth/api-auth-fixed'
import { createAdminClient } from '../../../lib/supabase/server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { companyId } = await requireCompanyAccess(req, res)
    if (!companyId) return res.status(400).json({ error: 'Company access required' })

    const {
      preset = 'today',
      employee_id = null,
      tz = 'America/Tegucigalpa',
      week_start = '1',
    } = req.query

    const supabase = createAdminClient()

    const employeeId =
      typeof employee_id === 'string' && employee_id.trim() !== '' ? employee_id.trim() : undefined

    if (employeeId) {
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('id')
        .eq('id', employeeId)
        .eq('company_id', companyId)
        .maybeSingle()
      if (employeeError) {
        console.error('attendance_kpis_unified employee lookup error', employeeError)
        return res.status(500).json({ error: employeeError.message })
      }
      if (!employee) {
        return res.status(404).json({ error: 'Employee not found' })
      }
    }

    const rpcArgs = {
      _company_id: companyId,
      _employee_id: employeeId,
      _preset: preset as string,
      _tz: tz as string,
      _week_start: parseInt(week_start as string, 10)
    }

    console.log('Unified RPC Args:', rpcArgs)

    const { data, error } = await supabase.rpc('attendance_kpis_unified', rpcArgs)

    if (error) {
      console.error('attendance_kpis_unified error', error)
      return res.status(500).json({ error: error.message })
    }

    return res.status(200).json(data)
  } catch (e: any) {
    if (res.headersSent) return
    console.error('attendance_kpis_unified error', e)
    return res.status(500).json({ error: e?.message || 'Internal error' })
  }
}
