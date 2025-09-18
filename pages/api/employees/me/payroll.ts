import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../../lib/supabase/server'
import { logger } from '../../../../lib/logger'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const supabase = createClient(req, res)
    
    // Check for employee session token (custom auth)
    const authHeader = req.headers.authorization || req.headers.Authorization as string
    const accessToken = req.cookies['sb-access-token'] || authHeader?.replace('Bearer ', '')
    
    if (!accessToken || !accessToken.startsWith('emp_')) {
      return res.status(401).json({ error: 'No autorizado' })
    }
    
    // Extract employee ID from token (format: emp_${employeeId}_${timestamp})
    const tokenParts = accessToken.split('_')
    const employeeId = tokenParts[1] // Should be the UUID
    
    if (!employeeId || employeeId.length !== 36) {
      return res.status(401).json({ 
        error: 'Token inválido',
        debug: {
          tokenFormat: accessToken.substring(0, 20) + '...',
          extractedId: employeeId
        }
      })
    }

    // Get current month for payroll data
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1

    // Try to get payroll data for current month
    const { data: payrollRuns, error: payrollError } = await supabase
      .from('payroll_runs')
      .select(`
        id,
        year,
        month,
        quincena,
        base_salary,
        total_deductions,
        net_salary,
        created_at,
        status
      `)
      .eq('employee_id', employeeId)
      .eq('year', currentYear)
      .order('created_at', { ascending: false })
      .limit(3)

    if (payrollError) {
      logger.error('Failed to get payroll data', payrollError)
    }

    // Get employee basic info for salary masking
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('base_salary')
      .eq('id', employeeId)
      .single()

    // Log access for audit
    logger.info('Employee accessed payroll info', {
      employeeId: employeeId,
      action: 'view_payroll',
      recordsFound: payrollRuns?.length || 0
    })

    // If no payroll data found
    if (!payrollRuns || payrollRuns.length === 0) {
      return res.status(404).json({
        message: 'No hay información de nómina disponible',
        hasData: false
      })
    }

    // Return masked payroll information
    const response = {
      hasData: true,
      lastPayment: payrollRuns[0]?.created_at ? 
        new Date(payrollRuns[0].created_at).toLocaleDateString('es-HN', {
          year: 'numeric',
          month: 'long'
        }) : 'No disponible',
      baseSalaryMasked: employee?.base_salary ? 'L. ****.**' : 'No disponible',
      recentPayrolls: payrollRuns.map(run => ({
        id: run.id,
        period: `${run.year}-${run.month.toString().padStart(2, '0')}`,
        quincena: run.quincena,
        netSalaryMasked: run.net_salary ? 'L. ****.**' : 'Procesando',
        status: run.status,
        date: run.created_at
      }))
    }

    return res.status(200).json(response)

  } catch (error) {
    logger.error('Employee payroll error', error)
    return res.status(500).json({
      error: 'Error interno del servidor'
    })
  }
}
