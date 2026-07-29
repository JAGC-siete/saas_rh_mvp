/**
 * Shared absolute SEO asset URLs (must resolve under public/).
 * Prefer /logo-humano-sisu.png over brand/sm until a dedicated 1200×630 og-image ships.
 */

export const SEO_BASE_URL = 'https://humanosisu.net'

/** Organization / publisher logo (tracked in public/). */
export const SEO_LOGO_PATH = '/logo-humano-sisu.png'

/**
 * Default Open Graph / Twitter image.
 * Dedicated /og-image.png is not in repo; logo is the available fallback.
 */
export const SEO_DEFAULT_OG_IMAGE_PATH = SEO_LOGO_PATH

export function seoAbsoluteUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  return `${SEO_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

export const SEO_LOGO_URL = seoAbsoluteUrl(SEO_LOGO_PATH)
export const SEO_DEFAULT_OG_IMAGE_URL = seoAbsoluteUrl(SEO_DEFAULT_OG_IMAGE_PATH)
