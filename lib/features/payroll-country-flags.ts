import type { CountryCode } from '../country/supported'

/**
 * Server-side flags to enable payroll engines beyond Honduras.
 * SLV/GTM default ON (statutory JSON + fail-fast). Set =0 / false to disable.
 * COL default OFF. Set PAYROLL_COUNTRY_COL_ENABLED=1 only once its engine exists.
 */
function envFlagEnabled(value: string | undefined, defaultOn: boolean): boolean {
  if (value == null || value.trim() === '') return defaultOn
  const v = value.trim().toLowerCase()
  if (v === '0' || v === 'false' || v === 'off') return false
  if (v === '1' || v === 'true' || v === 'on') return true
  return defaultOn
}

export function isPayrollCountryEngineEnabled(country: CountryCode): boolean {
  if (country === 'HND') return true
  if (country === 'SLV') return envFlagEnabled(process.env.PAYROLL_COUNTRY_SLV_ENABLED, true)
  if (country === 'GTM') return envFlagEnabled(process.env.PAYROLL_COUNTRY_GTM_ENABLED, true)
  // Colombia: OFF hasta que el motor (fases 2–7) y sus parámetros estén validados por un contador local.
  if (country === 'COL') return envFlagEnabled(process.env.PAYROLL_COUNTRY_COL_ENABLED, false)
  return false
}
