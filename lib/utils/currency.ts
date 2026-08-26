import type { CountryCode } from '../country/supported'
import { currencyForCountryCode, normalizeCountryCode } from '../country/supported'
import { localeForCountry } from '../country/payroll-labels'
import { formatMoneyForCountry, type DisplayCurrency } from '../country/display-money'

export type FormatCurrencyOptions = {
  minimumFractionDigits?: number
  maximumFractionDigits?: number
  showSymbol?: boolean
  currency?: DisplayCurrency
  locale?: string
  countryCode?: CountryCode | string | null
}

export const formatCurrency = (value: number, options?: FormatCurrencyOptions): string => {
  const {
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    showSymbol = true,
    countryCode,
    currency: currencyOpt,
    locale: localeOpt,
  } = options || {}

  if (countryCode != null) {
    return formatMoneyForCountry(value, countryCode, { minimumFractionDigits, maximumFractionDigits })
  }

  const currency = currencyOpt ?? 'HNL'
  const locale = localeOpt ?? (currency === 'USD' ? 'es-SV' : currency === 'GTQ' ? 'es-GT' : 'es-HN')

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits,
    maximumFractionDigits,
    ...(showSymbol ? {} : { currencyDisplay: 'code' }),
  }).format(value)
}

export const formatCurrencyShort = (value: number, countryCode?: CountryCode | string | null): string => {
  if (countryCode != null) {
    return formatMoneyForCountry(value, countryCode, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  }
  return formatCurrency(value, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export const formatCurrencyLong = (value: number, countryCode?: CountryCode | string | null): string => {
  if (countryCode != null) {
    return formatMoneyForCountry(value, countryCode)
  }
  return formatCurrency(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export const formatCurrencyValue = (value: number, countryCode?: CountryCode | string | null): string => {
  const country = countryCode != null ? normalizeCountryCode(countryCode) : null
  const currency = country ? currencyForCountryCode(country) : 'HNL'
  const locale = country ? localeForCountry(country) : 'es-HN'
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    currencyDisplay: 'code',
  }).format(value)
}
