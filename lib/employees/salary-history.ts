import { secureErrorLog } from '../security/safe-logging'

export const SALARY_AMOUNT_EPS = 0.009

function toAmount(value: unknown): number | null {
  if (value == null || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export function salaryAmountsDiffer(a: unknown, b: unknown): boolean {
  const na = toAmount(a)
  const nb = toAmount(b)
  if (na == null && nb == null) return false
  if (na == null || nb == null) return true
  return Math.abs(na - nb) > SALARY_AMOUNT_EPS
}

export type EmployeeSalaryHistoryInsert = {
  employee_id: string
  company_id: string
  old_amount: number | null
  new_amount: number
  effective_from?: string
  changed_by: string | null
}

export function buildSalaryHistoryInsert(
  row: EmployeeSalaryHistoryInsert
): Record<string, unknown> {
  return {
    employee_id: row.employee_id,
    company_id: row.company_id,
    old_amount: row.old_amount,
    new_amount: row.new_amount,
    effective_from: row.effective_from ?? new Date().toISOString(),
    changed_by: row.changed_by,
  }
}

/**
 * Persist a salary delta. Does not throw: employee update already committed.
 */
export async function recordEmployeeSalaryChange(
  supabase: { from: (table: string) => any },
  row: EmployeeSalaryHistoryInsert
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from('employee_salary_history')
    .insert(buildSalaryHistoryInsert(row))
  if (error) {
    secureErrorLog('Error recording employee salary history', error, {
      employeeId: row.employee_id,
      companyId: row.company_id,
    })
    return { ok: false, error: error.message || 'insert failed' }
  }
  return { ok: true }
}
