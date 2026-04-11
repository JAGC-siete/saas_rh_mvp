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
