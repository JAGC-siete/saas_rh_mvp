import type { CountryCode } from './supported'

export type StatutoryDeductionLabels = {
  primarySocial: string
  secondarySocial: string
  incomeTax: string
}

export function statutoryDeductionLabels(country: CountryCode): StatutoryDeductionLabels {
  switch (country) {
    case 'SLV':
      return { primarySocial: 'ISSS', secondarySocial: 'AFP', incomeTax: 'ISR' }
    case 'GTM':
      return { primarySocial: 'IGSS', secondarySocial: '—', incomeTax: 'ISR' }
    default:
      return { primarySocial: 'IHSS', secondarySocial: 'RAP', incomeTax: 'ISR' }
  }
}

export function localeForCountry(country: CountryCode): string {
  switch (country) {
    case 'SLV':
      return 'es-SV'
    case 'GTM':
      return 'es-GT'
    default:
      return 'es-HN'
  }
}

/** IANA para clasificación diurno/nocturno y formateo de reportes. */
export function timezoneForCountry(country: CountryCode): string {
  switch (country) {
    case 'SLV':
      return 'America/El_Salvador'
    case 'GTM':
      return 'America/Guatemala'
    default:
      return 'America/Tegucigalpa'
  }
}

export type ReportFormatContext = { timeZone: string; locale: string }

export function reportFormatForCountry(country: CountryCode): ReportFormatContext {
  return { timeZone: timezoneForCountry(country), locale: localeForCountry(country) }
}

export function defaultCurrencyForCountry(country: CountryCode): string {
  switch (country) {
    case 'SLV':
      return 'USD'
    case 'GTM':
      return 'GTQ'
    default:
      return 'HNL'
  }
}
