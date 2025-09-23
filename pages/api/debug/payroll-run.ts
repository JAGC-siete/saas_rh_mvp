import { NextApiRequest, NextApiResponse } from 'next'
import { requireCompanyAccess } from '../../../lib/auth/api-auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { supabase, companyId } = await requireCompanyAccess(req, res)
    const { run_id } = req.query

    if (!run_id) {
      return res.status(400).json({ error: 'run_id is required' })
    }

    console.log('🔍 DEBUG - Debugging payroll run:', { run_id, companyId })

    // Check if run exists
    const { data: run, error: runError } = await supabase
      .from('payroll_runs')
      .select('*')
      .eq('id', run_id)
      .single()

    console.log('🔍 DEBUG - Run query result:', { run, runError })

    // Check lines for this run
    const { data: lines, error: linesError } = await supabase
      .from('payroll_run_lines')
      .select('*')
      .eq('run_id', run_id)

    console.log('🔍 DEBUG - Lines query result:', { lines, linesError, linesCount: lines?.length })

    // Check lines with company filter
    const { data: linesWithCompany, error: linesWithCompanyError } = await supabase
      .from('payroll_run_lines')
      .select('*')
      .eq('run_id', run_id)
      .eq('company_id', companyId)

    console.log('🔍 DEBUG - Lines with company filter:', { 
      linesWithCompany, 
      linesWithCompanyError, 
      linesWithCompanyCount: linesWithCompany?.length 
    })

    return res.status(200).json({
      run_id,
      companyId,
      run: {
        exists: !!run,
        data: run,
        error: runError
      },
      lines: {
        total: lines?.length || 0,
        data: lines,
        error: linesError
      },
      linesWithCompany: {
        total: linesWithCompany?.length || 0,
        data: linesWithCompany,
        error: linesWithCompanyError
      }
    })

  } catch (error) {
    console.error('Debug payroll run error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
