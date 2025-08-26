import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../lib/supabase/server'

// Honduras 2025 constants (monthly)
const HND_2025 = {
  SALARIO_MINIMO: 11903.13,
  IHSS_TECHO: 11903.13,
  IHSS_PORC_E: 0.05, // 5%
  RAP_PORC: 0.015,   // 1.5%
}

function calcularISRMensual(salarioMensual: number): number {
  const BRACKETS = [
    { limit: 21457.76, rate: 0.0, base: 0, lower: 0 },
    { limit: 30969.88, rate: 0.15, base: 0, lower: 21457.76 },
    { limit: 67604.36, rate: 0.20, base: 1428.32, lower: 30969.88 },
    { limit: Infinity, rate: 0.25, base: 8734.32, lower: 67604.36 },
  ]
  for (const b of BRACKETS) {
    if (salarioMensual <= b.limit) {
      if (b.rate === 0) return 0
      if (b.base === 0) return Math.max(0, (salarioMensual - b.lower)) * b.rate
      return b.base + Math.max(0, (salarioMensual - b.lower)) * b.rate
    }
  }
  return 0
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { tenant } = req.query
    if (!tenant || typeof tenant !== 'string') {
      return res.status(400).json({ error: 'Tenant requerido' })
    }

    const supabase = createAdminClient()

    // Resolve company by subdomain - ESTA ES LA CLAVE
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, name, subdomain')
      .eq('name', 'Empresa Demo Trial')
      .eq('plan_type', 'trial')
      .eq('is_active', true)
      .single()

    if (companyError || !company) {
      console.error('❌ Empresa demo no encontrada:', companyError)
      return res.status(404).json({ error: 'Entorno demo no configurado' })
    }

    console.log('✅ Found company for trial:', company.name, 'ID:', company.id)

    // Active employees of THIS company (not Paragon)
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('id, name, dni, base_salary, bank_name, bank_account, status, department_id')
      .eq('company_id', company.id)  // Filtrar por la empresa del trial
      .eq('status', 'active')
      .order('name')

    if (employeesError) {
      return res.status(500).json({ error: 'Error obteniendo empleados', details: employeesError })
    }

    console.log('✅ Found', employees?.length || 0, 'employees for trial company')

    const startDate = '2025-08-01'
    const endDate = '2025-08-31'
    const daysInMonth = 31

    let attendance: any[] = []
    if (employees && employees.length > 0) {
      const employeeIds = employees.map((e: any) => e.id)
      const { data: attRows, error: attError } = await supabase
        .from('attendance_records')
        .select('employee_id, date, check_in, check_out, late_minutes, status')
        .in('employee_id', employeeIds)
        .gte('date', startDate)
        .lte('date', endDate)
      if (attError) {
        return res.status(500).json({ error: 'Error obteniendo asistencia', details: attError })
      }
      attendance = attRows || []
      console.log('✅ Found', attendance.length, 'attendance records for trial company')
    }

    // Index attendance
    const byEmployee = new Map<string, any[]>()
    for (const row of attendance) {
      const list = byEmployee.get(row.employee_id) || []
      list.push(row)
      byEmployee.set(row.employee_id, list)
    }

    // Compute per-employee payroll
    type PayrollRow = {
      employee_id: string
      name: string
      department_id: string | null
      monthly_salary: number
      days_worked: number
      days_absent: number
      late_days: number
      gross_salary: number
      ihss: number
      rap: number
      isr: number
      total_deductions: number
      net_salary: number
    }

    const rows: PayrollRow[] = (employees || []).map((e: any) => {
      const empSalary = Number(e.base_salary) || 0
      const records = (byEmployee.get(e.id) || [])
      // Count unique days with presence (check_in present)
      const presentDates = new Set<string>()
      let lateDays = 0
      for (const r of records) {
        if (r.check_in) presentDates.add(r.date)
        if ((r.late_minutes || 0) > 0) lateDays += 1
      }
      const daysWorked = presentDates.size
      const daysAbsent = Math.max(0, daysInMonth - daysWorked)

      // Proportional gross salary by days worked
      const gross = (empSalary / 30) * daysWorked

      // Monthly deductions, proportionally applied to attendance fraction for demo fairness
      const ihssMonthly = Math.min(empSalary, HND_2025.IHSS_TECHO) * HND_2025.IHSS_PORC_E
      const rapMonthly = Math.max(0, empSalary - HND_2025.SALARIO_MINIMO) * HND_2025.RAP_PORC
      const isrMonthly = calcularISRMensual(empSalary)
      const attendanceFactor = Math.min(1, daysWorked / 30)
      const ihss = ihssMonthly * attendanceFactor
      const rap = rapMonthly * attendanceFactor
      const isr = isrMonthly * attendanceFactor
      const totalDeductions = ihss + rap + isr
      const net = Math.max(0, gross - totalDeductions)

      return {
        employee_id: e.id,
        name: e.name,
        department_id: e.department_id || null,
        monthly_salary: Math.round(empSalary * 100) / 100,
        days_worked: daysWorked,
        days_absent: daysAbsent,
        late_days: lateDays,
        gross_salary: Math.round(gross * 100) / 100,
        ihss: Math.round(ihss * 100) / 100,
        rap: Math.round(rap * 100) / 100,
        isr: Math.round(isr * 100) / 100,
        total_deductions: Math.round(totalDeductions * 100) / 100,
        net_salary: Math.round(net * 100) / 100,
      }
    })

    const summary = rows.reduce(
      (acc, r) => {
        acc.employees += 1
        acc.totalGross += r.gross_salary
        acc.totalIHSS += r.ihss
        acc.totalRAP += r.rap
        acc.totalISR += r.isr
        acc.totalDeductions += r.total_deductions
        acc.totalNet += r.net_salary
        acc.totalDaysWorked += r.days_worked
        acc.totalDaysAbsent += r.days_absent
        acc.totalLateDays += r.late_days
        return acc
      },
      {
        employees: 0,
        totalGross: 0,
        totalIHSS: 0,
        totalRAP: 0,
        totalISR: 0,
        totalDeductions: 0,
        totalNet: 0,
        totalDaysWorked: 0,
        totalDaysAbsent: 0,
        totalLateDays: 0,
      }
    )

    return res.status(200).json({
      company: { id: company.id, name: company.name, subdomain: company.subdomain },
      period: { startDate, endDate },
      summary,
      records: rows,
    })
  } catch (error) {
    console.error('💥 Error en trial payroll:', error)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}


