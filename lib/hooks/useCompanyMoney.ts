import { useMemo } from 'react'
import { normalizeCountryCode, currencyForCountryCode, type CountryCode } from '../country/supported'
import { localeForCountry } from '../country/payroll-labels'
import { formatMoneyForCountry, moneyMaskForCountry, statutoryUiLabels } from '../country/display-money'
import { useCompanyContext } from '../useCompanyContext'

export function useCompanyMoney() {
  const { company, companyId, loading, error } = useCompanyContext()
  const countryCode: CountryCode = normalizeCountryCode(
    (company as { country_code?: string } | null)?.country_code
  )
  const currency = currencyForCountryCode(countryCode)
  const locale = localeForCountry(countryCode)
  const labels = statutoryUiLabels(countryCode)

  const format = useMemo(
    () => (value: number, opts?: { minimumFractionDigits?: number; maximumFractionDigits?: number }) =>
      formatMoneyForCountry(value, countryCode, opts),
    [countryCode]
  )

  return {
    companyId,
    loading,
    error,
    countryCode,
    currency,
    locale,
    labels,
    format,
    mask: moneyMaskForCountry(countryCode),
  }
}
