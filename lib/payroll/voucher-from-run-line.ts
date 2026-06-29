import { calculatePayroll } from '../payroll-client-specific'
import type { EmployeeReceiptInput } from './receipt'
import { buildCustomDeductionsList } from './custom-deductions-list'

export interface VoucherFromRunLineResult {
  record: EmployeeReceiptInput
  periodo: string
  quincena: number
  companyName: string
  periodLabel: string
  employeeCode: string
  filename: string
}

export async function buildVoucherFromRunLine(
  supabase: any,
  companyId: string,
  runLineId: string
): Promise<VoucherFromRunLineResult> {
  const { data: lineData, error: lineError } = await supabase
    .from('payroll_run_lines')
    .select(`
      id,
      employee_id,
      run_id,
      eff_bruto,
      eff_ihss,
      eff_rap,
      eff_isr,
      eff_neto,
      eff_hours,
      seventh_day_pay,
      metadata,
      employees:employee_id (
        name,
        employee_code,
        bank_name,
        bank_account,
        department_id,
        role
      ),
      payroll_runs:run_id (
        year,
        month,
        quincena
      )
    `)
    .eq('id', runLineId)
    .eq('company_id', companyId)
    .single()

  if (lineError || !lineData) {
    throw new Error('Línea de nómina no encontrada')
  }

  const employee = lineData.employees
  const run = lineData.payroll_runs

  if (!employee || !run) {
    throw new Error('Datos incompletos para generar el recibo')
  }

  let departmentName = 'Sin Departamento'
  if (employee.department_id) {
    const { data: dept } = await supabase
      .from('departments')
      .select('name')
      .eq('id', employee.department_id)
      .single()
    if (dept) departmentName = dept.name
  }

  const { data: company } = await supabase
    .from('companies')
    .select('name')
    .eq('id', companyId)
    .single()

  const periodo = `${run.year}-${String(run.month).padStart(2, '0')}`
  const ultimoDia = new Date(run.year, run.month, 0).getDate()
  const fechaInicio = run.quincena === 1 ? `${periodo}-01` : `${periodo}-16`
  const fechaFin = run.quincena === 1 ? `${periodo}-15` : `${periodo}-${ultimoDia}`

  let customDeductions = 0
  let customDeductionsList: Array<{ name: string; amount: number }> = []

  const brutoTotal = Number(lineData.eff_bruto) || 0
  if (lineData.metadata) {
    const calcResult = await calculatePayroll(
      companyId,
      brutoTotal,
      lineData.metadata,
      supabase
    )
    customDeductions = calcResult.totalDeduccionesAdicionales
    customDeductionsList = await buildCustomDeductionsList(
      companyId,
      lineData.metadata,
      brutoTotal,
      supabase
    )
  }

  const statutoryDeductions =
    (lineData.eff_ihss || 0) + (lineData.eff_rap || 0) + (lineData.eff_isr || 0)
  const totalDeductions = statutoryDeductions + customDeductions

  const septimoDia =
    Number(lineData.seventh_day_pay) ||
    Number((lineData.metadata as Record<string, unknown>)?.septimo_dia) ||
    0
  const baseSalaryForReceipt = septimoDia > 0 ? brutoTotal - septimoDia : brutoTotal

  const employeeCode = employee.employee_code || 'empleado'
  const periodLabel = `Quincena ${run.quincena}`

  return {
    record: {
      employee_code: employeeCode,
      employee_name: employee.name,
      department: departmentName,
      position: employee.role || 'N/A',
      period_start: fechaInicio,
      period_end: fechaFin,
      days_worked: Math.floor(lineData.eff_hours || 0),
      base_salary: baseSalaryForReceipt,
      septimo_dia: septimoDia > 0 ? septimoDia : undefined,
      income_tax: lineData.eff_isr || 0,
      professional_tax: lineData.eff_rap || 0,
      social_security: lineData.eff_ihss || 0,
      total_deductions: totalDeductions,
      net_salary: lineData.eff_neto || 0,
      bank_name: employee.bank_name || '',
      bank_account: employee.bank_account || '',
      custom_deductions: customDeductionsList,
    },
    periodo,
    quincena: run.quincena,
    companyName: company?.name || 'Empresa',
    periodLabel,
    employeeCode,
    filename: `recibo_${employeeCode}_${periodo}_q${run.quincena}.pdf`,
  }
}
