import type { CountryCode } from '../country/supported'

/**
 * Server-side flags to enable payroll engines beyond Honduras.
 * Set PAYROLL_COUNTRY_SLV_ENABLED=1 and PAYROLL_COUNTRY_GTM_ENABLED=1 when ready.
 */
export function isPayrollCountryEngineEnabled(country: CountryCode): boolean {
  if (country === 'HND') return true
  if (country === 'SLV') {
    const v = process.env.PAYROLL_COUNTRY_SLV_ENABLED
    return v === '1' || v === 'true'
  }
  if (country === 'GTM') {
    const v = process.env.PAYROLL_COUNTRY_GTM_ENABLED
    return v === '1' || v === 'true'
  }
  return false
}
