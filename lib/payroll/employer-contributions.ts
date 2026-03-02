/**
 * Honduras Employer Contributions (Aportaciones Patronales)
 *
 * IHSS Patronal: IVM 3.5% + EM 5% = 8.5% on ceiling
 * RAP Patronal: Fondo Reserva 4% + Fondo Vivienda 1.5% = 5.5%
 * INFOP: 1% on total payroll (when company is liable)
 *
 * Rates per 2025 legislation. Can be extended to tax_brackets later.
 */

import type { TaxConstants } from '../tax/honduras-tax'

// Employer rates (Honduras 2025) - not yet in tax_brackets
const IHSS_EMPLOYER_IVM_RATE = 0.035
const IHSS_EMPLOYER_EM_RATE = 0.05
const RAP_EMPLOYER_RESERVA_RATE = 0.04
const RAP_EMPLOYER_VIVIENDA_RATE = 0.015
const RAP_CEILING_MULTIPLIER = 3 // 3 salarios mínimos
const INFOP_RATE = 0.01

export interface EmployerContributionsInput {
  monthlySalary: number
  taxConstants: TaxConstants
  factor2Pagos?: number
}

export interface EmployerContributionsResult {
  ihssPatronal: number
  rapPatronal: number
  total: number
}

/**
 * IHSS Patronal: IVM (3.5%) + EM (5%) on base up to ceiling
 */
export function calculateIHSSPatronal(
  monthlySalary: number,
  constants: TaxConstants
): number {
  const base = Math.min(monthlySalary, constants.ihss_ceiling)
  const ivm = base * IHSS_EMPLOYER_IVM_RATE
  const em = base * IHSS_EMPLOYER_EM_RATE
  return ivm + em
}

/**
 * RAP Patronal: 4% Reserva + 1.5% Vivienda on base up to 3 salarios mínimos
 */
export function calculateRAPPatronal(
  monthlySalary: number,
  constants: TaxConstants
): number {
  const ceiling = constants.minimum_wage * RAP_CEILING_MULTIPLIER
  const base = Math.min(monthlySalary, ceiling)
  const reserva = base * RAP_EMPLOYER_RESERVA_RATE
  const vivienda = base * RAP_EMPLOYER_VIVIENDA_RATE
  return reserva + vivienda
}

/**
 * INFOP: 1% on gross payroll (when company is liable)
 */
export function calculateINFOP(totalGrossPayroll: number): number {
  return totalGrossPayroll * INFOP_RATE
}

/**
 * Calculate employer contributions for one employee
 */
export function calculateEmployerContributions(
  input: EmployerContributionsInput
): EmployerContributionsResult {
  const { monthlySalary, taxConstants, factor2Pagos = 1 } = input

  const ihss = calculateIHSSPatronal(monthlySalary, taxConstants) * factor2Pagos
  const rap = calculateRAPPatronal(monthlySalary, taxConstants) * factor2Pagos

  return {
    ihssPatronal: Math.round(ihss * 100) / 100,
    rapPatronal: Math.round(rap * 100) / 100,
    total: Math.round((ihss + rap) * 100) / 100
  }
}
