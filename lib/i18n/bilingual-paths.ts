import { PRIVACY_PUBLIC_PATH, TERMS_PUBLIC_PATH } from '../marketing/legal-paths'
import { stripLocalePrefix } from './locale'

/**
 * Marketing paths that ship real EN copy (dictionaries).
 * Only these get /en sitemap locs + hreflang en alternates.
 */
export const BILINGUAL_LANDING_PATHS = [
  '/',
  '/alternativa-odoo-honduras',
  '/sistema-biometrico-nomina',
  '/implementacion-48-horas',
  '/deducciones-honduras-ihss-rap-isr',
  '/calculadora',
  PRIVACY_PUBLIC_PATH,
  TERMS_PUBLIC_PATH,
] as const

const BILINGUAL_SET = new Set<string>(BILINGUAL_LANDING_PATHS)

/** True when bare path (no /en) has English body copy. */
export function isBilingualLandingPath(pathOrAsPath: string): boolean {
  const bare = stripLocalePrefix(pathOrAsPath).split(/[?#]/)[0] || '/'
  return BILINGUAL_SET.has(bare)
}
