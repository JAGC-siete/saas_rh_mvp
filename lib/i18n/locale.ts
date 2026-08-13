export type LandingLocale = 'es' | 'en'

export const DEFAULT_LOCALE: LandingLocale = 'es'
export const LOCALES: LandingLocale[] = ['es', 'en']

export function isLandingLocale(value: unknown): value is LandingLocale {
  return value === 'es' || value === 'en'
}

/** Browser path (asPath) → locale. Works with /en rewrites. */
export function getLocaleFromAsPath(asPath: string): LandingLocale {
  const path = asPath.split(/[?#]/)[0] || '/'
  if (path === '/en' || path.startsWith('/en/')) return 'en'
  return 'es'
}

/** Strip /en prefix; keep leading slash. */
export function stripLocalePrefix(asPath: string): string {
  const [path, query = ''] = asPath.split('?')
  const hashIdx = path.indexOf('#')
  const pathname = hashIdx >= 0 ? path.slice(0, hashIdx) : path
  const hash = hashIdx >= 0 ? path.slice(hashIdx) : ''
  let stripped = pathname
  if (stripped === '/en') stripped = '/'
  else if (stripped.startsWith('/en/')) stripped = stripped.slice(3)
  const q = query ? `?${query}` : ''
  return `${stripped || '/'}${q}${hash}`
}

/** Build locale-aware href. ES has no prefix; EN uses /en. */
export function localizedHref(locale: LandingLocale, href: string): string {
  if (!href) return locale === 'en' ? '/en' : '/'
  if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:') || href.startsWith('tel:')) {
    return href
  }
  // App / auth stay unprefixed
  if (href.startsWith('/app')) return href

  const hashIdx = href.indexOf('#')
  const hash = hashIdx >= 0 ? href.slice(hashIdx) : ''
  const withoutHash = hashIdx >= 0 ? href.slice(0, hashIdx) : href
  const [pathPart, query = ''] = withoutHash.split('?')
  const basePath = stripLocalePrefix(pathPart || '/')
  const q = query ? `?${query}` : ''

  if (locale === 'es') {
    return `${basePath}${q}${hash}`
  }
  if (basePath === '/') return `/en${q}${hash}`
  return `/en${basePath}${q}${hash}`
}

export function alternateLocale(locale: LandingLocale): LandingLocale {
  return locale === 'es' ? 'en' : 'es'
}

export const LOCALE_HTML_LANG: Record<LandingLocale, string> = {
  es: 'es',
  en: 'en',
}

export const LOCALE_SCHEMA_LANG: Record<LandingLocale, string> = {
  es: 'es-HN',
  en: 'en',
}
