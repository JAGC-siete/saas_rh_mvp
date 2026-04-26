/**
 * Honduras Labor Provisions (Provisiones Laborales)
 *
 * Monthly provision for:
 * - 13° (Aguinaldo): 1/12 of monthly salary, paid December
 * - 14°: 1/12 of monthly salary, paid June
 * - Vacaciones: ~1.5 days per month (15 days/year)
 * - Cesantía: reserve for severance (1 month per year)
 *
 * Provision = monthly accrual. Payment uses liability account (reversal).
 */

const PROVISION_13_RATE = 1 / 12
const PROVISION_14_RATE = 1 / 12
const VACATION_DAYS_PER_YEAR = 15
const VACATION_PROVISION_RATE = VACATION_DAYS_PER_YEAR / 360 // ~0.0417 per month
const SEVERANCE_MONTHS_PER_YEAR = 1
const SEVERANCE_PROVISION_RATE = SEVERANCE_MONTHS_PER_YEAR / 12 // 1/12

export interface LaborProvisionsInput {
  monthlySalary: number
  factor2Pagos?: number
  /** Proration by days worked (0-1). eff_bruto / (baseSalary * factor2Pagos). Default 1. */
  prorationFactor?: number
}

export interface LaborProvisionsResult {
  provision13: number
  provision14: number
  provisionVacaciones: number
  provisionCesantia: number
  total: number
}

/**
 * Provisión mensual 13° (Aguinaldo)
 */
export function calculateProvision13(monthlySalary: number): number {
  return monthlySalary * PROVISION_13_RATE
}

/**
 * Provisión mensual 14°
 */
export function calculateProvision14(monthlySalary: number): number {
  return monthlySalary * PROVISION_14_RATE
}

/**
 * Provisión mensual vacaciones (15 días/año)
 */
export function calculateProvisionVacaciones(monthlySalary: number): number {
  const dailyRate = monthlySalary / 30
  return dailyRate * VACATION_DAYS_PER_YEAR * (1 / 12)
}

/**
 * Provisión mensual cesantía (1 mes por año de antigüedad)
 */
export function calculateProvisionCesantia(monthlySalary: number): number {
  return monthlySalary * SEVERANCE_PROVISION_RATE
}

/**
 * Calculate all labor provisions for one employee (monthly accrual)
 */
export function calculateLaborProvisions(
  input: LaborProvisionsInput
): LaborProvisionsResult {
  const { monthlySalary, factor2Pagos = 1, prorationFactor = 1 } = input
  const factor = Math.min(1, Math.max(0, prorationFactor))

  const p13 = calculateProvision13(monthlySalary) * factor2Pagos * factor
  const p14 = calculateProvision14(monthlySalary) * factor2Pagos * factor
  const pVac = calculateProvisionVacaciones(monthlySalary) * factor2Pagos * factor
  const pCes = calculateProvisionCesantia(monthlySalary) * factor2Pagos * factor

  return {
    provision13: Math.round(p13 * 100) / 100,
    provision14: Math.round(p14 * 100) / 100,
    provisionVacaciones: Math.round(pVac * 100) / 100,
    provisionCesantia: Math.round(pCes * 100) / 100,
    total: Math.round((p13 + p14 + pVac + pCes) * 100) / 100
  }
}
