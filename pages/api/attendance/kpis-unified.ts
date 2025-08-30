import type { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../lib/supabase/server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { 
    preset = 'today', 
    employee_id = null,
    tz = 'America/Tegucigalpa',
    week_start = '1',
    company_id = '00000000-0000-0000-0000-000000000001'
  } = req.query

  const supabase = createAdminClient()
  
  const rpcArgs = {
    _company_id: company_id as string,
    _employee_id: (typeof employee_id === 'string' && employee_id.trim() !== '') ? employee_id.trim() : null,
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

  res.status(200).json(data)
}
