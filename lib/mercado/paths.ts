/**
 * Rutas del directorio Mercado Municipal Siguatepeque.
 *
 * Público canónico: /mercadosanpablosigua, /inscripcion y /[slug].
 * Legacy /mercado → 301. Assets estáticos siguen en /mercado/*.png.
 * Solicitudes: /app/admin/mercado-solicitudes. Fichas SuperAdmin: /app/admin/mercado-fichas.
 */

import type { RoleId } from '../auth/role-access'

export const MERCADO_PUBLIC_PREFIX = '/mercadosanpablosigua'
export const MERCADO_LEGACY_PREFIX = '/mercado'
export const MERCADO_ADMIN_PATH = '/app/admin/mercado-fichas'
/** @deprecated alias; usar MERCADO_ADMIN_PATH */
export const MERCADO_VENDORS_LEGACY_ADMIN_PATH = '/app/admin/vendors'
export const MERCADO_VENDORS_API_PATH = '/api/admin/mercado/vendors'
export const MERCADO_VENDORS_UPLOAD_API_PATH = '/api/admin/mercado/upload'
export const MERCADO_INSCRIPTION_PATH = `${MERCADO_PUBLIC_PREFIX}/inscripcion`
export const MERCADO_INSCRIPTION_API_PATH = '/api/mercado/inscriptions'
export const MERCADO_APPLICATIONS_ADMIN_PATH = '/app/admin/mercado-solicitudes'
export const MERCADO_APPLICATIONS_ADMIN_API_PATH = '/api/admin/mercado/applications'

/** SuperAdmin opera el directorio municipal (sin tenant SISU). */
export const MERCADO_ADMIN_ROLES = ['super_admin'] as const satisfies readonly RoleId[]

export const MERCADO_STORAGE_BUCKET = 'mercado-san-pablo'

export function mercadoHomePath(): string {
  return MERCADO_PUBLIC_PREFIX
}

export function mercadoVendorPath(slug: string): string {
  return `${MERCADO_PUBLIC_PREFIX}/${slug}`
}

export function mercadoInscriptionPath(): string {
  return MERCADO_INSCRIPTION_PATH
}

export function mercadoCategoryPath(category: string): string {
  return `${MERCADO_PUBLIC_PREFIX}?categoria=${category}`
}

export function mercadoAdminListPath(): string {
  return MERCADO_ADMIN_PATH
}

export function mercadoAdminNewPath(fromApplicationId?: string): string {
  const base = `${MERCADO_ADMIN_PATH}/nueva`
  if (!fromApplicationId) return base
  return `${base}?from=${encodeURIComponent(fromApplicationId)}`
}

export function mercadoAdminEditPath(id: string): string {
  return `${MERCADO_ADMIN_PATH}/${id}`
}

export function mercadoApplicationsAdminPath(): string {
  return MERCADO_APPLICATIONS_ADMIN_PATH
}

/**
 * Marca el directorio público (canónico y legacy) como SSR sin chrome de marketing.
 */
export function isPublicMercadoRoute(pathname: string): boolean {
  return matchesPrefix(pathname, MERCADO_PUBLIC_PREFIX) || matchesPrefix(pathname, MERCADO_LEGACY_PREFIX)
}

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}
