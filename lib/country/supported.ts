/** ISO 3166-1 alpha-3 */
export const SUPPORTED_COUNTRY_CODES = ['HND', 'SLV', 'GTM', 'COL'] as const

export type CountryCode = (typeof SUPPORTED_COUNTRY_CODES)[number]

/**
 * Países que ven los visitantes (calculadoras, cotizador, /activar, onboarding).
 * COL existe en la app pero queda fuera hasta que su motor de nómina esté validado.
 */
export const PUBLIC_COUNTRY_CODES = ['HND', 'SLV', 'GTM'] as const satisfies readonly CountryCode[]

export type PublicCountryCode = (typeof PUBLIC_COUNTRY_CODES)[number]

/** Alias comunes (alpha-2 / marketing) → ISO alpha-3 del SaaS */
const COUNTRY_CODE_ALIASES: Record<string, CountryCode> = {
  HN: 'HND',
  SV: 'SLV',
  GT: 'GTM',
  CO: 'COL',
}

export function isCountryCode(v: string | null | undefined): v is CountryCode {
  return v != null && (SUPPORTED_COUNTRY_CODES as readonly string[]).includes(v)
}

export function isPublicCountryCode(v: string | null | undefined): v is PublicCountryCode {
  return v != null && (PUBLIC_COUNTRY_CODES as readonly string[]).includes(v)
}

export function normalizeCountryCode(v: string | null | undefined): CountryCode {
  if (v == null || (typeof v === 'string' && v.trim() === '')) return 'HND'
  const upper = typeof v === 'string' ? v.trim().toUpperCase() : String(v).toUpperCase()
  if (isCountryCode(upper)) return upper
  const aliased = COUNTRY_CODE_ALIASES[upper]
  if (aliased) return aliased
  return 'HND'
}

/**
 * Entrada estricta para calculadoras/APIs públicas.
 * Devuelve null si el código no es reconocido o no es público (sin fallback silencioso).
 */
export function parseCountryCodeInput(v: string | null | undefined): PublicCountryCode | null {
  if (v == null || (typeof v === 'string' && v.trim() === '')) return 'HND'
  const upper = typeof v === 'string' ? v.trim().toUpperCase() : String(v).toUpperCase()
  if (isPublicCountryCode(upper)) return upper
  const aliased = COUNTRY_CODE_ALIASES[upper]
  if (aliased && isPublicCountryCode(aliased)) return aliased
  return null
}

/** IANA tz alineado con companies.timezone y migraciones multipaís. */
export function ianaTimezoneForCountryCode(cc: CountryCode): string {
  if (cc === 'SLV') return 'America/El_Salvador'
  if (cc === 'GTM') return 'America/Guatemala'
  if (cc === 'COL') return 'America/Bogota'
  return 'America/Tegucigalpa'
}

export function currencyForCountryCode(cc: PublicCountryCode): 'USD' | 'GTQ' | 'HNL'
export function currencyForCountryCode(cc: CountryCode): 'USD' | 'GTQ' | 'HNL' | 'COP'
export function currencyForCountryCode(cc: CountryCode): 'USD' | 'GTQ' | 'HNL' | 'COP' {
  if (cc === 'SLV') return 'USD'
  if (cc === 'GTM') return 'GTQ'
  if (cc === 'COL') return 'COP'
  return 'HNL'
}

/**
 * WhatsApp local con prefijo de país opcional, según jurisdicción elegida.
 * CA: 8 dígitos. Colombia: celular de 10 dígitos que empieza en 3.
 */
export function isValidLocalMobileForCountry(raw: string, cc: CountryCode): boolean {
  const cleaned = raw.replace(/[-\s]/g, '')
  const patterns: Record<CountryCode, RegExp> = {
    HND: /^(\+504|504)?[0-9]{8}$/,
    SLV: /^(\+503|503)?[0-9]{8}$/,
    GTM: /^(\+502|502)?[0-9]{8}$/,
    COL: /^(\+57|57)?3[0-9]{9}$/,
  }
  return patterns[cc].test(cleaned)
}
