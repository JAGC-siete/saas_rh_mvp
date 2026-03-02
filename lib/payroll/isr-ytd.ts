/**
 * ISR YTD (Year-to-Date) for projected annual calculation
 *
 * Updates employee_isr_ytd on payroll authorize.
 * Provides getIsrForPeriod which uses projection when company has use_isr_projection.
 */

import {
  calculateISR,
  calculateISRProjected,
  getTaxBracketsForYear,
  type TaxConstants
} from '../tax/honduras-tax'

export async function updateEmployeeIsrYtdOnAuthorize(
  supabase: any,
  companyId: string,
  year: number,
  lines: Array<{ employee_id: string; eff_bruto: number; eff_isr: number }>
): Promise<void> {
  if (!lines.length) return

  for (const line of lines) {
    const effBruto = Number(line.eff_bruto) || 0
    const effIsr = Number(line.eff_isr) || 0

    const { data: existing } = await supabase
      .from('employee_isr_ytd')
      .select('id, cumulative_income, cumulative_withheld')
      .eq('employee_id', line.employee_id)
      .eq('company_id', companyId)
      .eq('year', year)
      .maybeSingle()

    const prevIncome = Number(existing?.cumulative_income) || 0
    const prevWithheld = Number(existing?.cumulative_withheld) || 0

    await supabase.from('employee_isr_ytd').upsert(
      {
        employee_id: line.employee_id,
        company_id: companyId,
        year,
        cumulative_income: prevIncome + effBruto,
        cumulative_withheld: prevWithheld + effIsr,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'employee_id,company_id,year' }
    )
  }
}

export interface GetIsrForPeriodParams {
  supabase: any
  employeeId: string
  companyId: string
  year: number
  /** Calendar month 1-12 */
  month: number
  /** Quincena 1 or 2 for monthsElapsed fraction */
  quincena?: number
  periodIncome: number
  taxConstants: TaxConstants
  factor2Pagos?: number
  useProjection?: boolean
}

/**
 * Calculate ISR for a payroll period.
 * Uses projected annual when useProjection is true.
 */
export async function getIsrForPeriod(params: GetIsrForPeriodParams): Promise<number> {
  const {
    supabase,
    employeeId,
    companyId,
    year,
    month,
    quincena = 2,
    periodIncome,
    taxConstants,
    factor2Pagos = 1,
    useProjection = false
  } = params

  const monthlyEquivalent = periodIncome / factor2Pagos

  if (!useProjection) {
    return calculateISR(monthlyEquivalent, taxConstants.isr_brackets) * factor2Pagos
  }

  const { data: ytd } = await supabase
    .from('employee_isr_ytd')
    .select('cumulative_income, cumulative_withheld, medical_expenses_used')
    .eq('employee_id', employeeId)
    .eq('company_id', companyId)
    .eq('year', year)
    .maybeSingle()

  const ytdIncome = Number(ytd?.cumulative_income) || 0
  const ytdWithheld = Number(ytd?.cumulative_withheld) || 0
  const medicalUsed = Number(ytd?.medical_expenses_used) || 0
  const medicalLimit = taxConstants.medical_deduction_limit ?? 40000

  const monthsElapsed = month - 1 + (quincena === 2 ? 1 : 0.5)
  const withheld = calculateISRProjected({
    monthlyIncome: monthlyEquivalent,
    month: monthsElapsed,
    ytdIncome,
    ytdWithheld,
    medicalExpensesUsed: medicalUsed,
    brackets: taxConstants.isr_brackets,
    medicalDeductionLimit: medicalLimit
  })

  return withheld * factor2Pagos
}
