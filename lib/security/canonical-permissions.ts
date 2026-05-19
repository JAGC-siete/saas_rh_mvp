import { normalizeRole, type RoleId } from '../auth/role-access'

export type CanonicalPermissionKey =
  | 'can_access_dashboard'
  | 'can_view_employees'
  | 'can_manage_employees'
  | 'can_view_departments'
  | 'can_manage_departments'
  | 'can_view_attendance'
  | 'can_manage_attendance'
  | 'can_view_payroll'
  | 'can_manage_payroll'
  | 'can_authorize_payroll'
  | 'can_view_reports'
  | 'can_export_reports'
  | 'can_view_settings'
  | 'can_manage_settings'
  | 'can_create_work_schedules'
  | 'can_view_audit_logs'
  | 'can_manage_roles'
  | 'can_manage_company'
  | 'can_manage_billing'
  | 'can_view_own_profile'
  | 'can_view_own_attendance'
  | 'can_request_leave'
  | 'can_approve_leave'
  | 'can_view_salary'
  | 'can_edit_salary'

export type CanonicalPermissions = Record<CanonicalPermissionKey, boolean>

function emptyCanonical(): CanonicalPermissions {
  return {
    can_access_dashboard: false,
    can_view_employees: false,
    can_manage_employees: false,
    can_view_departments: false,
    can_manage_departments: false,
    can_view_attendance: false,
    can_manage_attendance: false,
    can_view_payroll: false,
    can_manage_payroll: false,
    can_authorize_payroll: false,
    can_view_reports: false,
    can_export_reports: false,
    can_view_settings: false,
    can_manage_settings: false,
    can_create_work_schedules: false,
    can_view_audit_logs: false,
    can_manage_roles: false,
    can_manage_company: false,
    can_manage_billing: false,
    can_view_own_profile: false,
    can_view_own_attendance: false,
    can_request_leave: false,
    can_approve_leave: false,
    can_view_salary: false,
    can_edit_salary: false,
  }
}

// Legacy permission keys observed in DB
const LEGACY_TO_CANONICAL: Array<{ when: string; set: CanonicalPermissionKey; value?: boolean }> = [
  // module-style
  { when: 'settings', set: 'can_view_settings' },
  { when: 'dashboard', set: 'can_access_dashboard' },
  { when: 'employees', set: 'can_view_employees' },
  { when: 'departments', set: 'can_view_departments' },
  { when: 'attendance', set: 'can_view_attendance' },
  { when: 'payroll', set: 'can_view_payroll' },
  { when: 'reports', set: 'can_view_reports' },
  { when: 'leave', set: 'can_request_leave' },

  // capability-style
  { when: 'manage_settings', set: 'can_manage_settings' },
  { when: 'create_work_schedules', set: 'can_create_work_schedules' },
  { when: 'manage_employees', set: 'can_manage_employees' },
  { when: 'manage_attendance', set: 'can_manage_attendance' },
  { when: 'manage_payroll', set: 'can_manage_payroll' },
  { when: 'manage_reports', set: 'can_export_reports' },

  // already canonical variants (pass-through is handled separately)
]

export function canonicalPermissionsForRole(role: unknown): Partial<CanonicalPermissions> {
  const r = normalizeRole(role)

  // Defaults per your proposed matrix. (User-specific overrides can still apply.)
  const base = emptyCanonical()
  if (!r) return base

  const grant = (keys: CanonicalPermissionKey[]) => {
    keys.forEach(k => (base[k] = true))
  }

  if (r === 'super_admin') {
    grant(Object.keys(base) as CanonicalPermissionKey[])
    return base
  }

  if (r === 'company_admin' || r === 'admin') {
    grant([
      'can_access_dashboard',
      'can_view_employees',
      'can_view_salary',
      'can_edit_salary',
      'can_manage_employees',
      'can_view_departments',
      'can_manage_departments',
      'can_view_attendance',
      'can_manage_attendance',
      'can_view_payroll',
      'can_manage_payroll',
      'can_authorize_payroll',
      'can_view_reports',
      'can_export_reports',
      'can_view_settings',
      'can_manage_settings',
      'can_view_audit_logs',
      'can_manage_roles',
      'can_manage_company',
      'can_view_own_profile',
      'can_view_own_attendance',
      'can_request_leave',
      'can_approve_leave',
      // can_manage_billing is intentionally left false by default
    ])
    return base
  }

  if (r === 'hr_manager') {
    grant([
      'can_access_dashboard',
      'can_view_employees',
      'can_view_salary',
      'can_edit_salary',
      'can_manage_employees',
      'can_view_departments',
      'can_manage_departments',
      'can_view_attendance',
      'can_manage_attendance',
      'can_view_payroll',
      'can_manage_payroll',
      'can_view_reports',
      'can_export_reports',
      'can_view_settings',
      'can_view_own_profile',
      'can_view_own_attendance',
      'can_request_leave',
      'can_approve_leave',
    ])
    return base
  }

  if (r === 'manager') {
    grant([
      'can_access_dashboard',
      'can_view_employees',
      'can_view_departments',
      'can_view_attendance',
      'can_manage_attendance',
      'can_view_own_profile',
      'can_view_own_attendance',
      'can_request_leave',
      'can_approve_leave',
    ])
    return base
  }

  if (r === 'employee') {
    grant([
      'can_view_own_profile',
      'can_view_own_attendance',
      'can_request_leave',
    ])
    return base
  }

  return base
}

export function normalizePermissionsToCanonical(
  role: unknown,
  raw: unknown
): CanonicalPermissions {
  const base = { ...emptyCanonical(), ...canonicalPermissionsForRole(role) }
  const input = (raw && typeof raw === 'object' && !Array.isArray(raw)) ? (raw as Record<string, any>) : {}

  // 1) Apply direct canonical keys if present
  for (const key of Object.keys(base) as CanonicalPermissionKey[]) {
    if (input[key] === true) base[key] = true
    if (input[key] === false) base[key] = false
  }

  // 2) Apply legacy mappings (true only; don't overwrite explicit canonical false)
  for (const m of LEGACY_TO_CANONICAL) {
    if (input[m.when] === true && base[m.set] !== false) {
      base[m.set] = true
    }
  }

  // 3) Derivations: manage implies view
  if (base.can_manage_settings) base.can_view_settings = true
  if (base.can_manage_settings) base.can_create_work_schedules = true
  if (base.can_manage_employees) base.can_view_employees = true
  if (base.can_manage_departments) base.can_view_departments = true
  if (base.can_manage_attendance) base.can_view_attendance = true
  if (base.can_manage_payroll) base.can_view_payroll = true
  if (base.can_export_reports) base.can_view_reports = true
  if (base.can_edit_salary) base.can_view_salary = true

  // 4) Manager: sin nómina ni reportes aunque el JSON legacy active payroll/reports
  if (normalizeRole(role) === 'manager') {
    base.can_view_payroll = false
    base.can_manage_payroll = false
    base.can_authorize_payroll = false
    base.can_view_reports = false
    base.can_export_reports = false
    base.can_view_settings = false
    base.can_manage_settings = false
    base.can_view_salary = false
    base.can_edit_salary = false
  }

  return base
}

