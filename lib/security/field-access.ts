import { normalizeRole } from '../auth/role-access'
import {
  normalizePermissionsToCanonical,
  type CanonicalPermissions,
} from './canonical-permissions'

export const SALARY_FIELD_KEY = 'employee.base_salary'

export type FieldDisplayMode = 'hidden' | 'masked' | 'locked'
export type FieldAccessLevel = 'none' | 'read' | 'write'

export type FieldAccessContext = {
  canViewSalary: boolean
  canEditSalary: boolean
  salaryDisplayMode: FieldDisplayMode
}

export type RoleFieldPermissionRow = {
  role: string
  field_key: string
  access_level: FieldAccessLevel
  display_mode: FieldDisplayMode
}

type UserProfileLike = {
  role?: unknown
  permissions?: unknown
}

function parsePermissionsRaw(raw: unknown): Record<string, unknown> {
  if (!raw) return {}
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {}
    } catch {
      return {}
    }
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>
  }
  return {}
}

function accessFromLevel(level: FieldAccessLevel): { view: boolean; edit: boolean } {
  if (level === 'write') return { view: true, edit: true }
  if (level === 'read') return { view: true, edit: false }
  return { view: false, edit: false }
}

/**
 * Pure resolution when DB row is unavailable (tests, fallback).
 * Priority: user JSON override > roleFieldRow > canonical defaults.
 */
export function resolveSalaryAccessFromSources(
  profile: UserProfileLike,
  roleFieldRow?: Pick<RoleFieldPermissionRow, 'access_level' | 'display_mode'> | null
): FieldAccessContext {
  const role = normalizeRole(profile.role)
  const raw = parsePermissionsRaw(profile.permissions)
  const canonical: CanonicalPermissions = normalizePermissionsToCanonical(role, raw)

  const hasViewOverride = raw.can_view_salary === true || raw.can_view_salary === false
  const hasEditOverride = raw.can_edit_salary === true || raw.can_edit_salary === false

  let canViewSalary = canonical.can_view_salary
  let canEditSalary = canonical.can_edit_salary
  let salaryDisplayMode: FieldDisplayMode = roleFieldRow?.display_mode ?? 'masked'

  if (roleFieldRow) {
    const fromDb = accessFromLevel(roleFieldRow.access_level)
    if (!hasViewOverride) canViewSalary = fromDb.view
    if (!hasEditOverride) canEditSalary = fromDb.edit
    salaryDisplayMode = roleFieldRow.display_mode
  }

  if (hasViewOverride) {
    canViewSalary = raw.can_view_salary === true
  }
  if (hasEditOverride) {
    canEditSalary = raw.can_edit_salary === true
  }

  if (canEditSalary) canViewSalary = true

  return {
    canViewSalary,
    canEditSalary,
    salaryDisplayMode: canViewSalary ? 'masked' : salaryDisplayMode,
  }
}

/**
 * Resolve field access once per request. Performs at most one DB query for role matrix.
 * On DB failure: fail-secure (deny salary) unless user JSON explicitly overrides.
 */
export async function resolveFieldAccessContext(
  profile: UserProfileLike,
  adminClient?: { from: (table: string) => any } | null
): Promise<FieldAccessContext> {
  let roleFieldRow: RoleFieldPermissionRow | null = null

  const role = normalizeRole(profile.role)
  if (adminClient && role) {
    const { data, error } = await adminClient
      .from('role_field_permissions')
      .select('role, field_key, access_level, display_mode')
      .eq('role', role)
      .eq('field_key', SALARY_FIELD_KEY)
      .maybeSingle()

    if (error) {
      // Fail-secure: treat as no access; explicit user JSON overrides still apply downstream.
      return resolveSalaryAccessFromSources(profile, {
        access_level: 'none',
        display_mode: 'masked',
      })
    }

    if (data) {
      roleFieldRow = data as RoleFieldPermissionRow
    }
  }

  return resolveSalaryAccessFromSources(profile, roleFieldRow)
}

export function userHasPermission(
  profile: UserProfileLike,
  key: keyof CanonicalPermissions
): boolean {
  const role = normalizeRole(profile.role)
  const raw = parsePermissionsRaw(profile.permissions)
  return normalizePermissionsToCanonical(role, raw)[key] === true
}
