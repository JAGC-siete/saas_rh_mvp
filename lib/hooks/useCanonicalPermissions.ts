import { useMemo } from 'react'
import { useAuth } from '../auth'
import {
  normalizePermissionsToCanonical,
  type CanonicalPermissions,
  type CanonicalPermissionKey,
} from '../security/canonical-permissions'

/**
 * Returns the canonical permission set for the currently authenticated user,
 * derived from `userProfile.role` + `userProfile.permissions` (legacy JSON or
 * canonical) via `normalizePermissionsToCanonical`.
 *
 * Safe before auth resolves: returns the empty canonical set (all `false`)
 * until userProfile is available. Consumers should treat that as "no permission".
 */
export function useCanonicalPermissions(): CanonicalPermissions {
  const { userProfile } = useAuth()

  return useMemo(() => {
    const role = (userProfile?.role || '').toString().trim().toLowerCase()
    let raw: Record<string, unknown> = {}
    const perms = userProfile?.permissions
    if (perms) {
      if (typeof perms === 'string') {
        try {
          const parsed = JSON.parse(perms)
          if (parsed && typeof parsed === 'object') {
            raw = parsed as Record<string, unknown>
          }
        } catch {
          raw = {}
        }
      } else if (typeof perms === 'object') {
        raw = perms as Record<string, unknown>
      }
    }
    return normalizePermissionsToCanonical(role, raw)
  }, [userProfile])
}

/**
 * Shortcut for checking a single canonical permission key.
 */
export function useCanonicalPermission(key: CanonicalPermissionKey): boolean {
  return useCanonicalPermissions()[key] === true
}

/**
 * Returns true when the current user can export reports/CSV/Excel/PDF (nómina, empleados, etc.).
 * Mirrors backend helper `canExportReports` in `lib/security/permissions.ts`.
 */
export function useCanExportReports(): boolean {
  return useCanonicalPermission('can_export_reports')
}

/**
 * Reportes de asistencia: managers y usuarios con permiso granular.
 * Mirrors backend `canExportAttendanceReports`.
 */
export function useCanExportAttendanceReports(): boolean {
  const perms = useCanonicalPermissions()
  return perms.can_export_reports === true || perms.can_export_attendance_reports === true
}

export type ExportPermissionScope = 'full' | 'attendance'

/** Gate de UI según alcance de exportación. */
export function useCanExportReportsScope(scope: ExportPermissionScope = 'full'): boolean {
  const full = useCanExportReports()
  const attendance = useCanExportAttendanceReports()
  return scope === 'attendance' ? attendance : full
}
