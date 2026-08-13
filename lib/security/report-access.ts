import { canAccessPayrollNavigation } from '../auth/role-access'
import { normalizePermissionsToCanonical } from './canonical-permissions'
import type { ReportType } from '../reports/report-config-schema'

function parseRawPermissions(raw: unknown): Record<string, unknown> {
  if (!raw) return {}
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {}
    } catch {
      return {}
    }
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw as Record<string, unknown>
  return {}
}

/**
 * Acceso al módulo /app/reports (sidebar y página).
 */
export function canAccessReportsModule(role: unknown, permissions: unknown): boolean {
  const normalizedRole = (role || '').toString().trim().toLowerCase()
  const canonical = normalizePermissionsToCanonical(normalizedRole, parseRawPermissions(permissions))

  if (canAccessPayrollNavigation(normalizedRole) && canonical.can_view_reports) {
    return true
  }

  return canonical.can_view_attendance_reports === true
}

/**
 * Tipos de reporte visibles en ReportBuilder según permisos del usuario.
 */
export function allowedReportTypesForUser(role: unknown, permissions: unknown): ReportType[] | 'all' {
  const normalizedRole = (role || '').toString().trim().toLowerCase()
  const canonical = normalizePermissionsToCanonical(normalizedRole, parseRawPermissions(permissions))

  if (canAccessPayrollNavigation(normalizedRole) && canonical.can_view_reports) {
    return 'all'
  }

  if (canonical.can_view_attendance_reports) {
    return ['attendance']
  }

  return []
}
