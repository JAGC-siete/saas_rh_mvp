/** ISO 3166-1 alpha-3 */
export const SUPPORTED_COUNTRY_CODES = ['HND', 'SLV', 'GTM'] as const

export type CountryCode = (typeof SUPPORTED_COUNTRY_CODES)[number]

export function isCountryCode(v: string | null | undefined): v is CountryCode {
  return v != null && (SUPPORTED_COUNTRY_CODES as readonly string[]).includes(v)
}

export function normalizeCountryCode(v: string | null | undefined): CountryCode {
  if (isCountryCode(v)) return v
  return 'HND'
}

/** IANA tz alineado con companies.timezone y migraciones multipaís. */
export function ianaTimezoneForCountryCode(cc: CountryCode): string {
  if (cc === 'SLV') return 'America/El_Salvador'
  if (cc === 'GTM') return 'America/Guatemala'
  return 'America/Tegucigalpa'
}

export function currencyForCountryCode(cc: CountryCode): 'USD' | 'GTQ' | 'HNL' {
  if (cc === 'SLV') return 'USD'
  if (cc === 'GTM') return 'GTQ'
  return 'HNL'
}

/**
 * WhatsApp local (8 dígitos) con prefijo de país opcional, según jurisdicción elegida.
 */
export function isValidLocalMobileForCountry(raw: string, cc: CountryCode): boolean {
  const cleaned = raw.replace(/[-\s]/g, '')
  const patterns: Record<CountryCode, RegExp> = {
    HND: /^(\+504|504)?[0-9]{8}$/,
    SLV: /^(\+503|503)?[0-9]{8}$/,
    GTM: /^(\+502|502)?[0-9]{8}$/,
  }
  return patterns[cc].test(cleaned)
}
