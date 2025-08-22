import { createClient, createAdminClient } from '../../lib/supabase/server'
import { NextApiRequest, NextApiResponse } from 'next'

// Payroll API Handler
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req

  switch (method) {
    case 'POST':
      return generatePayroll(req, res)
    case 'GET':
      return getPayrollRecords(req, res)
    default:
      res.setHeader('Allow', ['POST', 'GET'])
      res.status(405).end(`Method ${method} Not Allowed`)
  }
}

async function generatePayroll(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { employee_id, period_start, period_end, period_type = 'monthly' } = req.body

    // Create Supabase client with cookie handling
    const supabase = createClient(req, res)
    
    // ✅ Get user with getUser() to validate token with Supabase server
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const userId = user.id

    // Check if user has HR or admin permissions
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('role, company_id')
      .eq('id', userId)
      .single()

    if (!userProfile || !['company_admin', 'hr_manager'].includes(userProfile.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }

    // Get employee data
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('*')
      .eq('id', employee_id)
      .eq('company_id', userProfile.company_id)
      .single()

    if (empError || !employee) {
      return res.status(404).json({ error: 'Employee not found' })
    }

    // Get attendance records for the period
    const { data: attendanceRecords } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('employee_id', employee_id)
      .gte('date', period_start)
      .lte('date', period_end)

    // Calculate attendance metrics (handle null case)
    const records = attendanceRecords || []
    const totalDays = records.length
    const daysWorked = records.filter(r => r.status === 'present' || r.status === 'late').length
    const daysAbsent = records.filter(r => r.status === 'absent').length
    const lateDays = records.filter(r => r.status === 'late').length

    // Calculate earnings
    const baseSalary = parseFloat(employee.base_salary)
    const dailySalary = baseSalary / 30 // Assuming 30 days per month
    const earnedSalary = dailySalary * daysWorked

    // Honduras tax calculations
    const grossSalary = earnedSalary
    const incomeTax = calculateISR(grossSalary) // Ya es mensual
    const professionalTax = grossSalary * 0.015 // 1.5% RAP
    const socialSecurity = grossSalary * 0.05 // 5% IHSS (2.5% EM + 2.5% IVM)
    
    const totalDeductions = incomeTax + professionalTax + socialSecurity
    const netSalary = grossSalary - totalDeductions

    // Check if payroll already exists for this period
    const { data: existingPayroll } = await supabase
      .from('payroll_records')
      .select('id')
      .eq('employee_id', employee_id)
      .eq('period_start', period_start)
      .eq('period_end', period_end)
      .single()

    if (existingPayroll) {
      return res.status(400).json({ error: 'Payroll already exists for this period' })
    }

    // Create payroll record
    const { data: payrollRecord, error: payrollError } = await supabase
      .from('payroll_records')
      .insert({
        employee_id,
        period_start,
        period_end,
        period_type,
        base_salary: baseSalary,
        gross_salary: grossSalary,
        income_tax: incomeTax,
        professional_tax: professionalTax,
        social_security: socialSecurity,
        total_deductions: totalDeductions,
        net_salary: netSalary,
        days_worked: daysWorked,
        days_absent: daysAbsent,
        late_days: lateDays,
        status: 'draft'
      })
      .select()
      .single()

    if (payrollError) {
      return res.status(500).json({ error: payrollError.message })
    }

    return res.status(201).json({
      message: 'Payroll generated successfully',
      data: payrollRecord,
      summary: {
        baseSalary,
        grossSalary,
        totalDeductions,
        netSalary,
        daysWorked,
        daysAbsent,
        lateDays
      }
    })

  } catch (error) {
    console.error('Payroll generation error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function getPayrollRecords(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { employee_id, period_start, period_end, status, page = 1, limit = 20 } = req.query

    // Create Supabase client with cookie handling
    const supabase = createClient(req, res)
    
    // ✅ Get user with getUser() to validate token with Supabase server
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const userId = user.id

    let query = supabase
      .from('payroll_records')
      .select(`
        *,
        employees:employee_id (
          name,
          employee_code,
          dni,
          position
        )
      `)
      .order('period_start', { ascending: false })

    if (employee_id) {
      query = query.eq('employee_id', employee_id)
    }

    if (period_start) {
      query = query.gte('period_start', period_start)
    }

    if (period_end) {
      query = query.lte('period_end', period_end)
    }

    if (status) {
      query = query.eq('status', status)
    }

    // Pagination
    const from = (Number(page) - 1) * Number(limit)
    const to = from + Number(limit) - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    return res.status(200).json({
      data,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count,
        totalPages: Math.ceil((count || 0) / Number(limit))
      }
    })

  } catch (error) {
    console.error('Get payroll error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// Honduras ISR calculation function
function calculateISR(monthlySalary: number): number {
  const taxBrackets = [
    { min: 0, max: 40000, rate: 0 },                    // Exento hasta L 40,000
    { min: 40000, max: 217493.16, rate: 0.15 },         // 15%
    { min: 217493.16, max: 494224.40, rate: 0.20 },     // 20%
    { min: 494224.40, max: Infinity, rate: 0.25 }       // 25%
  ]

  const exemption = 40000 // Deducción médica anual L 40,000
  const annualSalary = monthlySalary * 12
  const taxableIncome = Math.max(0, annualSalary - exemption)
  
  let tax = 0
  let remainingIncome = taxableIncome

  for (const bracket of taxBrackets) {
    if (remainingIncome <= 0) break
    
    const taxableInThisBracket = Math.min(remainingIncome, bracket.max - bracket.min)
    tax += taxableInThisBracket * bracket.rate
    remainingIncome -= taxableInThisBracket
  }
  
  return tax / 12 // Convertir a mensual
}
