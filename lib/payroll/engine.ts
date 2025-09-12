// Motor de cálculo de nómina puro y parametrizado
// Honduras 2025 - IHSS/RAP/ISR con reglas oficiales

import { supabase } from '../supabase'

// Tipos para el motor de cálculo
export interface PayrollRules {
  ihss: {
    employer_rate: number
    employee_rate: number
    ceiling: number
  }
  rap: {
    employee_rate: number
    employer_rate: number
    floor: number
  }
  isr: {
    brackets: Array<{
      min_amount: number
      max_amount: number | null
      rate: number
      fixed_amount: number
    }>
  }
}

export interface EmployeeData {
  id: string
  name: string
  base_salary: number
  days_worked: number
  days_absent: number
  late_days: number
  department?: string
}

export interface PayrollCalculation {
  employee_id: string
  name: string
  base_salary: number
  total_earnings: number
  IHSS: number
  RAP: number
  ISR: number
  total_deducciones: number
  total: number
  days_worked: number
  days_absent: number
  late_days: number
  department?: string
}

export interface PayrollSummary {
  empleados: number
  total_bruto: number
  total_deducciones: {
    IHSS: number
    RAP: number
    ISR: number
    otros: number
  }
  total_neto: number
  total_dias_trabajados: number
  total_horas_extras: number
}

// Función para cargar reglas desde la base de datos
export async function loadPayrollRules(year: number = 2025, date: Date = new Date()): Promise<PayrollRules> {
  try {
    // Cargar reglas IHSS (usar COMBINED para cálculos simplificados)
    const { data: ihssData, error: ihssError } = await supabase
      .from('ihss_rules')
      .select('employer_rate, employee_rate, ceiling')
      .eq('year', year)
      .eq('regime', 'COMBINED')
      .lte('effective_from', date.toISOString().split('T')[0])
      .or(`effective_to.is.null,effective_to.gte.${date.toISOString().split('T')[0]}`)
      .order('effective_from', { ascending: false })
      .limit(1)
      .single()

    if (ihssError || !ihssData) {
      throw new Error(`Error loading IHSS rules: ${ihssError?.message || 'No data found'}`)
    }

    // Cargar reglas RAP
    const { data: rapData, error: rapError } = await supabase
      .from('rap_rules')
      .select('employee_rate, employer_rate, floor')
      .eq('year', year)
      .lte('effective_from', date.toISOString().split('T')[0])
      .or(`effective_to.is.null,effective_to.gte.${date.toISOString().split('T')[0]}`)
      .order('effective_from', { ascending: false })
      .limit(1)
      .single()

    if (rapError || !rapData) {
      throw new Error(`Error loading RAP rules: ${rapError?.message || 'No data found'}`)
    }

    // Cargar brackets ISR
    const { data: isrData, error: isrError } = await supabase
      .from('isr_brackets')
      .select('min_amount, max_amount, rate, fixed_amount')
      .eq('year', year)
      .lte('effective_from', date.toISOString().split('T')[0])
      .or(`effective_to.is.null,effective_to.gte.${date.toISOString().split('T')[0]}`)
      .order('bracket_order')

    if (isrError || !isrData) {
      throw new Error(`Error loading ISR brackets: ${isrError?.message || 'No data found'}`)
    }

    return {
      ihss: {
        employer_rate: Number(ihssData.employer_rate),
        employee_rate: Number(ihssData.employee_rate),
        ceiling: Number(ihssData.ceiling)
      },
      rap: {
        employee_rate: Number(rapData.employee_rate),
        employer_rate: Number(rapData.employer_rate),
        floor: Number(rapData.floor)
      },
      isr: {
        brackets: isrData.map(bracket => ({
          min_amount: Number(bracket.min_amount),
          max_amount: bracket.max_amount ? Number(bracket.max_amount) : null,
          rate: Number(bracket.rate),
          fixed_amount: Number(bracket.fixed_amount)
        }))
      }
    }
  } catch (error) {
    console.error('Error loading payroll rules:', error)
    throw error
  }
}

// Función pura para calcular IHSS
export function calcIHSS(baseSalary: number, rules: PayrollRules): number {
  const ceiling = Math.min(baseSalary, rules.ihss.ceiling)
  return Math.round(ceiling * rules.ihss.employee_rate * 100) / 100
}

// Función pura para calcular RAP
export function calcRAP(baseSalary: number, rules: PayrollRules): number {
  const taxableAmount = Math.max(0, baseSalary - rules.rap.floor)
  return Math.round(taxableAmount * rules.rap.employee_rate * 100) / 100
}

// Función pura para calcular ISR
export function calcISR(baseSalary: number, rules: PayrollRules): number {
  for (const bracket of rules.isr.brackets) {
    if (baseSalary <= bracket.min_amount) {
      continue
    }
    
    const taxableAmount = Math.min(
      baseSalary,
      bracket.max_amount || Infinity
    ) - bracket.min_amount
    
    if (taxableAmount > 0) {
      return Math.round((bracket.fixed_amount + (taxableAmount * bracket.rate)) * 100) / 100
    }
  }
  
  return 0
}

// Función pura para calcular ingresos
export function calcEarnings(baseSalary: number, daysWorked: number, totalDays: number): number {
  // Salario proporcional por días trabajados
  const proportionalSalary = (baseSalary / totalDays) * daysWorked
  return Math.round(proportionalSalary * 100) / 100
}

// Función pura para calcular nómina individual
export function calcPayrollRow(
  employee: EmployeeData,
  rules: PayrollRules,
  totalDays: number,
  calculationType: 'CON' | 'SIN' = 'CON'
): PayrollCalculation {
  const total_earnings = calcEarnings(employee.base_salary, employee.days_worked, totalDays)
  
  let IHSS = 0
  let RAP = 0
  let ISR = 0
  let total_deducciones = 0
  let total = total_earnings
  
  if (calculationType === 'CON') {
    IHSS = calcIHSS(employee.base_salary, rules)
    RAP = calcRAP(employee.base_salary, rules)
    ISR = calcISR(employee.base_salary, rules)
    total_deducciones = IHSS + RAP + ISR
    total = Math.round((total_earnings - total_deducciones) * 100) / 100
  }
  
  return {
    employee_id: employee.id,
    name: employee.name,
    base_salary: employee.base_salary,
    total_earnings,
    IHSS,
    RAP,
    ISR,
    total_deducciones,
    total,
    days_worked: employee.days_worked,
    days_absent: employee.days_absent,
    late_days: employee.late_days,
    department: employee.department
  }
}

// Función pura para generar resumen
export function summarizePayroll(calculations: PayrollCalculation[]): PayrollSummary {
  return calculations.reduce(
    (summary, calc) => {
      summary.empleados += 1
      summary.total_bruto += calc.total_earnings
      summary.total_deducciones.IHSS += calc.IHSS
      summary.total_deducciones.RAP += calc.RAP
      summary.total_deducciones.ISR += calc.ISR
      summary.total_neto += calc.total
      summary.total_dias_trabajados += calc.days_worked
      summary.total_horas_extras += 0 // TODO: Implementar cálculo de horas extras
      
      return summary
    },
    {
      empleados: 0,
      total_bruto: 0,
      total_deducciones: {
        IHSS: 0,
        RAP: 0,
        ISR: 0,
        otros: 0
      },
      total_neto: 0,
      total_dias_trabajados: 0,
      total_horas_extras: 0
    }
  )
}

// Función principal del motor de cálculo
export async function calculatePayroll(
  employees: EmployeeData[],
  periodStart: Date,
  periodEnd: Date,
  calculationType: 'CON' | 'SIN' = 'CON'
): Promise<{
  calculations: PayrollCalculation[]
  summary: PayrollSummary
  rules: PayrollRules
}> {
  // Calcular días del período
  const totalDays = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
  
  // Cargar reglas
  const rules = await loadPayrollRules(2025, periodStart)
  
  // Calcular cada empleado
  const calculations = employees.map(employee => 
    calcPayrollRow(employee, rules, totalDays, calculationType)
  )
  
  // Generar resumen
  const summary = summarizePayroll(calculations)
  
  return {
    calculations,
    summary,
    rules
  }
}

// Función para validar reglas de negocio
export function validatePayrollCalculation(calculation: PayrollCalculation): string[] {
  const errors: string[] = []
  
  if (calculation.total_earnings < 0) {
    errors.push('Total earnings cannot be negative')
  }
  
  if (calculation.IHSS < 0) {
    errors.push('IHSS cannot be negative')
  }
  
  if (calculation.RAP < 0) {
    errors.push('RAP cannot be negative')
  }
  
  if (calculation.ISR < 0) {
    errors.push('ISR cannot be negative')
  }
  
  if (calculation.total_deducciones < 0) {
    errors.push('Total deductions cannot be negative')
  }
  
  if (calculation.total < 0) {
    errors.push('Net salary cannot be negative')
  }
  
  return errors
}

// Función para validar resumen
export function validatePayrollSummary(summary: PayrollSummary): string[] {
  const errors: string[] = []
  
  if (summary.empleados < 0) {
    errors.push('Employee count cannot be negative')
  }
  
  if (summary.total_bruto < 0) {
    errors.push('Total gross cannot be negative')
  }
  
  if (summary.total_neto < 0) {
    errors.push('Total net cannot be negative')
  }
  
  const calculatedDeductions = summary.total_deducciones.IHSS + 
                              summary.total_deducciones.RAP + 
                              summary.total_deducciones.ISR + 
                              summary.total_deducciones.otros
  
  if (Math.abs(summary.total_bruto - summary.total_neto - calculatedDeductions) > 0.01) {
    errors.push('Summary calculation mismatch: gross - net ≠ deductions')
  }
  
  return errors
}

const payrollEngine = {
  loadPayrollRules,
  calcIHSS,
  calcRAP,
  calcISR,
  calcEarnings,
  calcPayrollRow,
  summarizePayroll,
  calculatePayroll,
  validatePayrollCalculation,
  validatePayrollSummary
}

export default payrollEngine
