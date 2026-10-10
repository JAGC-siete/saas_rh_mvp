import Decimal from 'decimal.js'
import { calculateBenefit } from './calculate'
import { formatDateISO, parseDateYmd } from './calendar'

export type BenefitTipo = '13AVO' | '14AVO'

export interface BenefitPreviewEmployee {
  id: string
  name: string
  base_salary: number | null
  hire_date: string | null
}

export type BenefitPreviewWarning = 'missing_hire_date' | 'missing_salary'

export interface BenefitPreviewRow {
  employee_id: string
  name: string
  hire_date: string | null
  base_salary: number
  days_worked: number
  amount: number
  warning: BenefitPreviewWarning | null
}

export interface BenefitPreviewResult {
  periodo: { inicio: string; fin: string }
  rows: BenefitPreviewRow[]
  total: number
}

/**
 * 13vo covers Jan 1–Dec 31 of `year`. 14vo for `year` is the one paid in June of
 * that year, so it covers Jul 1 of `year - 1` through Jun 30 of `year`.
 */
export function resolveBenefitPeriodForYear(
  tipo: BenefitTipo,
  year: number
): { inicio: Date; fin: Date } {
  if (tipo === '13AVO') {
    return { inicio: new Date(year, 0, 1), fin: new Date(year, 11, 31) }
  }
  return { inicio: new Date(year - 1, 6, 1), fin: new Date(year, 5, 30) }
}

/**
 * Proportional 13vo/14vo for active employees on base salary.
 * Employees hired after the period end are left out; terminated employees are
 * not expected here because their proportional amount is paid in the liquidation.
 */
export function buildBenefitPreview(
  employees: BenefitPreviewEmployee[],
  tipo: BenefitTipo,
  year: number
): BenefitPreviewResult {
  const { inicio, fin } = resolveBenefitPeriodForYear(tipo, year)
  const fechaCalculo = formatDateISO(fin)
  const rows: BenefitPreviewRow[] = []

  for (const emp of employees) {
    const baseSalary = Number(emp.base_salary) || 0
    const hire = emp.hire_date ? parseDateYmd(emp.hire_date.slice(0, 10)) : null
    const hireValid = hire != null && !Number.isNaN(hire.getTime())

    if (hireValid && hire > fin) continue

    const row: BenefitPreviewRow = {
      employee_id: emp.id,
      name: emp.name,
      hire_date: hireValid ? formatDateISO(hire) : null,
      base_salary: baseSalary,
      days_worked: 0,
      amount: 0,
      warning: null,
    }

    if (!hireValid) {
      row.warning = 'missing_hire_date'
    } else if (baseSalary <= 0) {
      row.warning = 'missing_salary'
    } else {
      const result = calculateBenefit({
        tipo,
        salarioBaseMensual: baseSalary,
        fechaIngreso: formatDateISO(hire),
        fechaCalculo,
        modoCalculo: 'proporcional',
      })
      row.days_worked = result.diasEnPeriodo
      row.amount = result.monto
    }

    rows.push(row)
  }

  const total = rows
    .reduce((acc, r) => acc.plus(r.amount), new Decimal(0))
    .toDecimalPlaces(2)
    .toNumber()

  return {
    periodo: { inicio: formatDateISO(inicio), fin: fechaCalculo },
    rows,
    total,
  }
}
