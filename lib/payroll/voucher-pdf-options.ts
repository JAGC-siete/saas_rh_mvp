import type { BrandingConfig } from '../reports/report-config-schema'
import type { ResolvedReportConfig } from '../reports/column-resolver'
import { normalizeCountryCode, type CountryCode } from '../country/supported'
import { resolvePayrollDisplayCurrency, type DisplayCurrency } from '../country/display-money'

export interface VoucherPdfOptions {
  branding?: BrandingConfig
  visibleSections?: Set<string>
  labels?: Record<string, string>
  currency?: DisplayCurrency
  countryCode?: CountryCode
}

export function buildVoucherPdfOptions(resolved: ResolvedReportConfig): VoucherPdfOptions {
  return {
    branding: resolved.branding,
    visibleSections: new Set(resolved.columns.map((c) => c.id)),
    labels: Object.fromEntries(resolved.columns.map((c) => [c.id, c.label])),
  }
}

export function withCompanyMoneyOptions(
  options: VoucherPdfOptions | undefined,
  countryCode: string | null | undefined,
  storedCurrency?: string | null
): VoucherPdfOptions {
  const country = normalizeCountryCode(countryCode)
  return {
    ...(options || {}),
    countryCode: country,
    currency: resolvePayrollDisplayCurrency(country, storedCurrency),
  }
}

export function formatVoucherCompanyName(
  branding: BrandingConfig | undefined,
  fallbackName: string
): string {
  const base = branding?.legalName?.trim() || fallbackName
  if (branding?.useLegalSuffix && !/S\.\s*de\s*R\.L\./i.test(base)) {
    return `${base} S. de R.L.`
  }
  return base
}
