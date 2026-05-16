/**
 * Single source of truth for role normalization and access checks.
 *
 * IMPORTANT:
 * - Always normalize roles before comparing.
 * - Keep this file dependency-light so it can be used across API, middleware and frontend.
 */

export type RoleId =
  | 'super_admin'
  | 'admin'
  | 'company_admin'
  | 'hr_manager'
  | 'manager'
  | 'employee'

export function normalizeRole(role: unknown): RoleId | null {
  const r = (typeof role === 'string' ? role : '').trim().toLowerCase()
  if (!r) return null

  // Allow only known roles to reduce surprises from typos.
  const allowed: RoleId[] = [
    'super_admin',
    'admin',
    'company_admin',
    'hr_manager',
    'manager',
    'employee'
  ]
  return (allowed as string[]).includes(r) ? (r as RoleId) : null
}

export const ADMIN_ROLES: readonly RoleId[] = [
  'super_admin',
  'admin',
  'company_admin',
  'hr_manager',
  'manager'
] as const

export function canLoginToApp(role: unknown): boolean {
  const r = normalizeRole(role)
  return !!r && (ADMIN_ROLES as readonly string[]).includes(r)
}

/** Sidebar + páginas: nómina, cesantías, deducciones, 13–14, reportes, MTP, evaluaciones. */
export const PAYROLL_NAV_ROLES = [
  'super_admin',
  'admin',
  'company_admin',
  'hr_manager',
] as const satisfies readonly RoleId[]

export function canAccessPayrollNavigation(role: unknown): boolean {
  const r = normalizeRole(role)
  return !!(r && (PAYROLL_NAV_ROLES as readonly string[]).includes(r))
}

export function canAccessAdminFeatures(role: unknown): boolean {
  // For now, same as "admin roles" used at login.
  // If later you want managers to login but not see admin areas, split these functions.
  return canLoginToApp(role)
}

