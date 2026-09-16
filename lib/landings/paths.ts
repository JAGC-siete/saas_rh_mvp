/** Rutas del módulo de landings. Evita strings mágicos entre shell, dashboard y render público. */

import { SEO_BASE_URL } from '../seo/assets'

export const LANDINGS_ADMIN_PATH = '/app/landings'
export const LANDING_PUBLIC_PREFIX = '/p'
export const LANDING_LEAD_API_PATH = '/api/landings/lead'

export function landingAdminEditPath(id: string): string {
  return `${LANDINGS_ADMIN_PATH}/${id}/edit`
}

export function landingAdminLeadsPath(id: string): string {
  return `${LANDINGS_ADMIN_PATH}/${id}/leads`
}

export function landingPublicPath(slug: string): string {
  return `${LANDING_PUBLIC_PREFIX}/${slug}`
}

/** URL absoluta para compartir por WhatsApp o pegar en Google Maps / Instagram. */
export function landingPublicUrl(slug: string): string {
  return `${SEO_BASE_URL}${landingPublicPath(slug)}`
}

/**
 * Marca /p/* como ruta pública SSR sin chrome de marketing.
 * La consume _app.tsx vía lib/seo/public-ssr-routes.ts (selección de shell, no autenticación).
 */
export function isPublicLandingRoute(pathname: string): boolean {
  return pathname === LANDING_PUBLIC_PREFIX || pathname.startsWith(`${LANDING_PUBLIC_PREFIX}/`)
}
