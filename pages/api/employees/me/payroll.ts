import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../../lib/supabase/server'
import { logger } from '../../../../lib/logger'
import {
  assertEmployeePortalEnabled,
  resolveEmployeeAndCompanyId,
} from '../../../../lib/employee-portal/company-settings'

interface PayrollResponse {
  records: any[]
  runLines: any[]
  baseSalary?: number
  employeeName?: string
  currentPeriod: {
    year: number
    month: number
  }
  summary: {
    totalRecords: number
    lastPayment?: string
    lastAmount?: number
  }
}

interface ErrorResponse {
  error: string
  debug?: any
  details?: any
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<PayrollResponse | ErrorResponse>) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const supabase = createClient(req, res)
    
    // Use standard Supabase Auth like admin portal
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return res.status(401).json({ error: 'No autorizado' })
    }

    const ctx = await resolveEmployeeAndCompanyId(supabase, user)
    if (!ctx) {
      return res.status(401).json({ error: 'Datos de empleado no encontrados' })
    }
    if (!(await assertEmployeePortalEnabled(supabase, ctx.companyId, res))) {
      return
    }
    const { employeeId } = ctx

    // Get current month for payroll data
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1 // getMonth() is 0-indexed

    // Try to get payroll records first (more comprehensive)
    const { data: payrollRecords, error: recordsError } = await supabase
      .from('payroll_records')
      .select(`
        id,
        period_start,
        period_end,
        base_salary,
        gross_salary,
        net_salary,
        total_deductions,
        income_tax,
        social_security,
        days_worked,
        status,
        paid_at,
        created_at
      `)
      .eq('employee_id', employeeId)
      .gte('period_start', `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`)
      .lt('period_start', `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-01`)
      .order('period_end', { ascending: false })
      .limit(5)

    logger.info('Payroll records query result', { 
      recordsError, 
      recordsCount: payrollRecords?.length || 0,
      employeeId 
    })

    // Also try payroll_run_lines for more recent data
    const { data: runLines, error: runLinesError } = await supabase
      .from('payroll_run_lines')
      .select(`
        id,
        eff_bruto,
        eff_neto,
        eff_ihss,
        eff_rap,
        eff_isr,
        eff_hours,
        created_at,
        payroll_runs!inner(
          year,
          month,
          quincena,
          status
        )
      `)
      .eq('employee_id', employeeId)
      .eq('payroll_runs.year', currentYear)
      .gte('payroll_runs.month', currentMonth - 2) // Last 3 months
      .order('created_at', { ascending: false })
      .limit(5)

    logger.info('Payroll run lines query result', { 
      runLinesError, 
      runLinesCount: runLines?.length || 0,
      employeeId 
    })

    // Get employee base salary for reference
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('base_salary, name')
      .eq('id', employeeId)
      .single()

    logger.info('Employee data query result', { 
      empError, 
      hasEmployee: !!employee,
      employeeId 
    })

    // If no data found, return empty response
    if ((!payrollRecords || payrollRecords.length === 0) && 
        (!runLines || runLines.length === 0)) {
      logger.info('No payroll data found for employee', { employeeId, currentYear, currentMonth })
      return res.status(404).json({ 
        error: 'No payroll data found for this period',
        debug: { employeeId, currentYear, currentMonth }
      })
    }

    // Build response with available data
    const response: PayrollResponse = {
      records: payrollRecords || [],
      runLines: runLines || [],
      baseSalary: employee?.base_salary,
      employeeName: employee?.name,
      currentPeriod: {
        year: currentYear,
        month: currentMonth
      },
      summary: {
        totalRecords: (payrollRecords?.length || 0) + (runLines?.length || 0),
        lastPayment: payrollRecords?.[0]?.paid_at || runLines?.[0]?.created_at,
        lastAmount: payrollRecords?.[0]?.net_salary || runLines?.[0]?.eff_neto
      }
    }

    return res.status(200).json(response)

  } catch (error) {
    logger.error('API error fetching employee payroll', error)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}