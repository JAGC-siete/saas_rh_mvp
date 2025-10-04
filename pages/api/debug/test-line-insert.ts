import { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from "../../../lib/auth/api-auth-fixed"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { supabase, companyId } = await requireCompanyAccess(req, res)
    const { run_id, employee_id } = req.body

    if (!run_id || !employee_id) {
      return res.status(400).json({ error: 'run_id and employee_id are required' })
    }

    console.log('🔍 DEBUG - Testing line insertion:', { run_id, employee_id, companyId })

    // Test data
    const testLine = {
      run_id: run_id,
      company_id: companyId,
      employee_id: employee_id,
      calc_hours: 8,
      calc_bruto: 1000,
      calc_ihss: 50,
      calc_rap: 15,
      calc_isr: 100,
      calc_neto: 835,
      eff_hours: 8,
      eff_bruto: 1000,
      eff_ihss: 50,
      eff_rap: 15,
      eff_isr: 100,
      eff_neto: 835,
      edited: false
    }

    console.log('🔍 DEBUG - Test line data:', testLine)

    const { data: insertedLine, error: lineError } = await supabase
      .from('payroll_run_lines')
      .insert(testLine)
      .select('id')
      .single()

    console.log('🔍 DEBUG - Insert result:', { insertedLine, lineError })

    if (lineError) {
      return res.status(500).json({
        error: 'Line insertion failed',
        details: lineError,
        testData: testLine
      })
    }

    return res.status(200).json({
      success: true,
      insertedLine,
      testData: testLine
    })

  } catch (error) {
    console.error('Debug test line insert error:', error)
    return res.status(500).json({ error: 'Internal server error', details: error })
  }
}
