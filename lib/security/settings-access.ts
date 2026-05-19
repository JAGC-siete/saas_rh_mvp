import { normalizeRole } from '../auth/role-access'
import {
  normalizePermissionsToCanonical,
  type CanonicalPermissions,
} from './canonical-permissions'

export type SettingsAccessContext = {
  /** Sidebar Parametros + all settings tabs (read). */
  canViewFullSettings: boolean
  /** Full settings module including edit/delete schedules and other tabs. */
  canManageSettings: boolean
  /** Schedules tab only: list + create new (no edit/delete, no other tabs). */
  canAccessSchedulesCreateOnly: boolean
  canCreateWorkSchedules: boolean
  canManageWorkSchedules: boolean
  /** Show Parametros in navigation. */
  showSettingsNav: boolean
}

function profilePermissionsRaw(raw: unknown): Record<string, unknown> {
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

export function resolveSettingsAccessFromProfile(profile: {
  role?: unknown
  permissions?: unknown
}): SettingsAccessContext {
  const role = normalizeRole(profile.role)
  const raw = profilePermissionsRaw(profile.permissions)
  const canonical: CanonicalPermissions = normalizePermissionsToCanonical(role, raw)

  const canManageSettings = canonical.can_manage_settings
  const canViewFullSettings = canonical.can_view_settings || canManageSettings
  const canCreateWorkSchedules =
    canonical.can_create_work_schedules || canManageSettings
  const canManageWorkSchedules = canManageSettings

  const canAccessSchedulesCreateOnly =
    canCreateWorkSchedules && !canViewFullSettings

  const showSettingsNav = canViewFullSettings || canCreateWorkSchedules

  return {
    canViewFullSettings,
    canManageSettings,
    canAccessSchedulesCreateOnly,
    canCreateWorkSchedules,
    canManageWorkSchedules,
    showSettingsNav,
  }
}

export function userCanAccessFullSettings(profile: {
  role?: unknown
  permissions?: unknown
}): boolean {
  return resolveSettingsAccessFromProfile(profile).canViewFullSettings
}
