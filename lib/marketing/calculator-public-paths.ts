import type { CountryCode } from '../country/supported'

/** Public slugs for deduction calculators (internal pages stay at pages/calculadora-deducciones*). */
export const DEDUCTION_CALCULATOR_PUBLIC_PATHS = {
  HND: '/calcusisuhn',
  SLV: '/calcusisusv',
  GTM: '/calcusisuguate',
} as const satisfies Record<CountryCode, string>

/** @deprecated Internal routes only — use DEDUCTION_CALCULATOR_PUBLIC_PATHS in user-facing URLs. */
export const DEDUCTION_CALCULATOR_INTERNAL_PATHS = {
  HND: '/calculadora-deducciones',
  SLV: '/calculadora-deducciones-el-salvador',
  GTM: '/calculadora-deducciones-guatemala',
} as const satisfies Record<CountryCode, string>

export function deductionCalculatorPublicPath(country: CountryCode): string {
  return DEDUCTION_CALCULATOR_PUBLIC_PATHS[country]
}

export function deductionCalculatorInternalPath(country: CountryCode): string {
  return DEDUCTION_CALCULATOR_INTERNAL_PATHS[country]
}

export const ALL_DEDUCTION_CALCULATOR_PUBLIC_PATHS = Object.values(
  DEDUCTION_CALCULATOR_PUBLIC_PATHS
)

export const ALL_DEDUCTION_CALCULATOR_INTERNAL_PATHS = Object.values(
  DEDUCTION_CALCULATOR_INTERNAL_PATHS
)
