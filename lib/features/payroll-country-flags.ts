import type { CountryCode } from '../country/supported'

/**
 * Server-side flags to enable payroll engines beyond Honduras.
 * SLV/GTM default ON (statutory JSON + fail-fast). Set =0 / false to disable.
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
  return false
}
