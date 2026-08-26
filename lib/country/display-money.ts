import type { CountryCode } from './supported'
import { currencyForCountryCode, normalizeCountryCode } from './supported'
import { localeForCountry, statutoryDeductionLabels } from './payroll-labels'

export type DisplayCurrency = 'HNL' | 'USD' | 'GTQ'

export function isDisplayCurrency(v: unknown): v is DisplayCurrency {
  return v === 'HNL' || v === 'USD' || v === 'GTQ'
}

/**
 * Moneda de presentación: `companies.country_code` gana sobre metadata residual (p. ej. HNL en un trial SLV).
 */
export function resolvePayrollDisplayCurrency(
  countryCode: CountryCode | string | null | undefined,
  storedCurrency?: string | null
): DisplayCurrency {
  const country = normalizeCountryCode(countryCode)
  const expected = currencyForCountryCode(country)
  if (isDisplayCurrency(storedCurrency) && storedCurrency === expected) return storedCurrency
  return expected
}

export function formatPdfMoney(value: number, currency: DisplayCurrency): string {
  const formatted = Number(value || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  if (currency === 'USD') return `$${formatted}`
  if (currency === 'GTQ') return `Q ${formatted}`
  return `L. ${formatted}`
}

export function formatMoneyForCountry(
  value: number,
  countryCode: CountryCode | string | null | undefined,
  options?: { minimumFractionDigits?: number; maximumFractionDigits?: number }
): string {
  const country = normalizeCountryCode(countryCode)
  const currency = currencyForCountryCode(country)
  const locale = localeForCountry(country)
  const {
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
  } = options || {}
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(Number(value) || 0)
}

export function moneyMaskForCountry(countryCode: CountryCode | string | null | undefined): string {
  const currency = currencyForCountryCode(normalizeCountryCode(countryCode))
  if (currency === 'USD') return '$ *******'
  if (currency === 'GTQ') return 'Q *******'
  return 'L. *******'
}

export function statutoryUiLabels(countryCode: CountryCode | string | null | undefined) {
  return statutoryDeductionLabels(normalizeCountryCode(countryCode))
}

export function currencyNounForCountry(countryCode: CountryCode | string | null | undefined): string {
  const currency = currencyForCountryCode(normalizeCountryCode(countryCode))
  if (currency === 'USD') return 'dólares'
  if (currency === 'GTQ') return 'quetzales'
  return 'lempiras'
}
