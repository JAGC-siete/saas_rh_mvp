/** Permisos de rol para el menú lateral (sin React, para poder probarlo). */
import { normalizePermissionsToCanonical } from '../security/canonical-permissions'
import { canAccessPayrollNavigation } from '../auth/role-access'
import { canAccessReportsModule } from '../security/report-access'
import { canAccessDeduccionesModule } from '../security/deducciones-access'
import type { NavPermissions } from './sidebar'

/** Mientras se resuelven: módulos sensibles ocultos (deny-by-default). */
export const RESOLVING_PERMISSIONS: NavPermissions = {
  dashboard: true,
  employees: true,
  departments: true,
  attendance: true,
  leave: true,
  payroll: false,
  deducciones: false,
  reports: false,
  settings: false,
  mtp: false,
  performance: false,
}

/** Sin perfil o con error: solo Inicio y Soporte. */
export const PESSIMISTIC_PERMISSIONS: NavPermissions = {
  dashboard: true,
  employees: false,
  departments: false,
  attendance: false,
  leave: false,
  payroll: false,
  deducciones: false,
  reports: false,
  settings: false,
  mtp: false,
  performance: false,
}

export interface ProfileLike {
  id?: string
  role?: string | null
  permissions?: unknown
}

function parseRawPermissions(raw: unknown): Record<string, any> {
  if (!raw) return {}
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw)
    } catch {
      return {}
    }
  }
  return raw as Record<string, any>
}

export function computeNavPermissions(profile: ProfileLike): NavPermissions {
  const rawPermissions = parseRawPermissions(profile.permissions)
  const role = (profile.role || '').toString().trim().toLowerCase()
  const canonical = normalizePermissionsToCanonical(role, rawPermissions)
  const payrollGroup = canAccessPayrollNavigation(role)
  return {
    dashboard: !!canonical.can_access_dashboard,
    employees: !!canonical.can_view_employees,
    departments: !!canonical.can_view_departments,
    attendance: !!canonical.can_view_attendance,
    leave: !!canonical.can_request_leave,
    payroll: payrollGroup && !!(canonical.can_view_payroll || canonical.can_manage_payroll),
    deducciones: canAccessDeduccionesModule(role, rawPermissions),
    reports: canAccessReportsModule(role, rawPermissions),
    settings: !!(canonical.can_view_settings || canonical.can_create_work_schedules),
    mtp: payrollGroup && rawPermissions?.mtp !== false,
    performance: payrollGroup && rawPermissions?.performance !== false,
  }
}
