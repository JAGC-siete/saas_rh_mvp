/**
 * Rutas del directorio Mercado Municipal Siguatepeque.
 *
 * Público: /mercado y /mercado/[slug] — mismo shell que /p/* (SSR, sin Auth, sin chrome marketing).
 * Admin tenant: /app/admin/vendors — shell autenticado de /app/*.
 *
 * No usa pages/index.tsx ni pages/[slug].tsx: esas rutas son Humano SISU.
 */

import type { RoleId } from '../auth/role-access'

export const MERCADO_PUBLIC_PREFIX = '/mercado'
export const MERCADO_ADMIN_PATH = '/app/admin/vendors'
export const MERCADO_VENDORS_API_PATH = '/api/mercado/vendors'

/** Alta/edición de puestos: tenant admin, no SuperAdmin de Humano SISU. */
export const MERCADO_ADMIN_ROLES = ['super_admin', 'admin', 'company_admin'] as const satisfies readonly RoleId[]

export function mercadoHomePath(): string {
  return MERCADO_PUBLIC_PREFIX
}

export function mercadoVendorPath(slug: string): string {
  return `${MERCADO_PUBLIC_PREFIX}/${slug}`
}

export function mercadoCategoryPath(category: string): string {
  return `${MERCADO_PUBLIC_PREFIX}?categoria=${category}`
}

export function mercadoAdminListPath(): string {
  return MERCADO_ADMIN_PATH
}

export function mercadoAdminNewPath(): string {
  return `${MERCADO_ADMIN_PATH}/new`
}

export function mercadoAdminEditPath(id: string): string {
  return `${MERCADO_ADMIN_PATH}/${id}`
}

/**
 * Marca /mercado y /mercado/* como ruta pública SSR sin chrome de marketing.
 * La consume _app.tsx vía isPublicTenantLandingRoute.
 */
export function isPublicMercadoRoute(pathname: string): boolean {
  return pathname === MERCADO_PUBLIC_PREFIX || pathname.startsWith(`${MERCADO_PUBLIC_PREFIX}/`)
}
