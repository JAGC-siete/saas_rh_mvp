import type { CountryCode } from '../country/supported'

/**
 * Canonical public URLs for deduction calculators (match pages/calculadora-deducciones*).
 * Restored after short-lived calcusisu* experiment — keep those as 301 aliases in next.config.
 */
export const DEDUCTION_CALCULATOR_PUBLIC_PATHS = {
  HND: '/calculadora-deducciones',
  SLV: '/calculadora-deducciones-el-salvador',
  GTM: '/calculadora-deducciones-guatemala',
} as const satisfies Record<CountryCode, string>

/** Page-file routes (same as public after restore). */
export const DEDUCTION_CALCULATOR_INTERNAL_PATHS = {
  HND: '/calculadora-deducciones',
  SLV: '/calculadora-deducciones-el-salvador',
  GTM: '/calculadora-deducciones-guatemala',
} as const satisfies Record<CountryCode, string>

/** Former public slugs — 301 → DEDUCTION_CALCULATOR_PUBLIC_PATHS in next.config. */
export const DEDUCTION_CALCULATOR_LEGACY_PATHS = {
  HND: '/calcusisuhn',
  SLV: '/calcusisusv',
  GTM: '/calcusisuguate',
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

export const ALL_DEDUCTION_CALCULATOR_LEGACY_PATHS = Object.values(
  DEDUCTION_CALCULATOR_LEGACY_PATHS
)
