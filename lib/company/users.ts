/**
 * Company-scoped user management helpers.
 * Actors: company_admin | hr_manager. Never creates super_admin; company_id always from session.
 */
import {
  normalizePermissionsToCanonical,
  type CanonicalPermissionKey,
  type CanonicalPermissions,
} from '../security/canonical-permissions'
import { normalizeRole } from '../auth/role-access'

export const COMPANY_MANAGED_ROLES = [
  'company_admin',
  'hr_manager',
  'manager',
  'employee',
] as const

export type CompanyManagedRole = (typeof COMPANY_MANAGED_ROLES)[number]

export const COMPANY_USER_ACTORS = ['company_admin', 'hr_manager'] as const

export type CompanyUserActorRole = (typeof COMPANY_USER_ACTORS)[number]

export type CompanyModuleKey =
  | 'employees'
  | 'departments'
  | 'attendance'
  | 'leave'
  | 'payroll'
  | 'reports'
  | 'settings'
  | 'mtp'
  | 'performance'

export type ModuleGrant = {
  view?: boolean
  manage?: boolean
}

/** Maps UI modules → canonical permission keys + optional plan feature_key. */
export const COMPANY_MODULE_DEFS: Array<{
  key: CompanyModuleKey
  label: string
  featureKey: string | null
  viewKey?: CanonicalPermissionKey
  manageKey?: CanonicalPermissionKey
  /** Stored as legacy boolean in permissions jsonb (no canonical key yet). */
  legacyKey?: string
}> = [
  {
    key: 'employees',
    label: 'Empleados',
    featureKey: 'employees',
    viewKey: 'can_view_employees',
    manageKey: 'can_manage_employees',
  },
  {
    key: 'departments',
    label: 'Departamentos',
    featureKey: 'departments',
    viewKey: 'can_view_departments',
    manageKey: 'can_manage_departments',
  },
  {
    key: 'attendance',
    label: 'Asistencia',
    featureKey: 'attendance',
    viewKey: 'can_view_attendance',
    manageKey: 'can_manage_attendance',
  },
  {
    key: 'leave',
    label: 'Permisos / vacaciones',
    featureKey: null,
    viewKey: 'can_request_leave',
    manageKey: 'can_approve_leave',
  },
  {
    key: 'payroll',
    label: 'Nómina',
    featureKey: 'payroll',
    viewKey: 'can_view_payroll',
    manageKey: 'can_manage_payroll',
  },
  {
    key: 'reports',
    label: 'Reportes',
    featureKey: 'reports',
    viewKey: 'can_view_reports',
    manageKey: 'can_export_reports',
  },
  {
    key: 'settings',
    label: 'Parámetros',
    featureKey: null,
    viewKey: 'can_view_settings',
    manageKey: 'can_manage_settings',
  },
  {
    key: 'mtp',
    label: 'MTP Puestos',
    featureKey: 'mtp_job_descriptions',
    legacyKey: 'mtp',
  },
  {
    key: 'performance',
    label: 'Evaluaciones',
    featureKey: 'performance_evaluations',
    legacyKey: 'performance',
  },
]

export function isCompanyManagedRole(role: unknown): role is CompanyManagedRole {
  const r = normalizeRole(role)
  return !!r && (COMPANY_MANAGED_ROLES as readonly string[]).includes(r)
}

export function roleCanEditSalary(role: unknown): boolean {
  const r = normalizeRole(role)
  return r === 'company_admin' || r === 'hr_manager' || r === 'admin'
}

/**
 * Enforce salary rules:
 * - can_edit_salary only for company_admin / hr_manager (by role)
 * - others: can_edit_salary always false; can_view_salary optional
 * - edit implies view
 */
export function applySalaryPermissionRules(
  role: unknown,
  permissions: Record<string, boolean>,
  canViewSalary?: boolean | null
): Record<string, boolean> {
  const next = { ...permissions }
  const canEdit = roleCanEditSalary(role)

  if (canEdit) {
    next.can_edit_salary = true
    next.can_view_salary = true
  } else {
    next.can_edit_salary = false
    if (canViewSalary === true) next.can_view_salary = true
    else if (canViewSalary === false) next.can_view_salary = false
    else if (typeof next.can_view_salary !== 'boolean') {
      next.can_view_salary = false
    }
  }

  if (next.can_edit_salary) next.can_view_salary = true
  return next
}

export function isModuleEnabledByFeatures(
  moduleKey: CompanyModuleKey,
  features: Record<string, boolean>
): boolean {
  const def = COMPANY_MODULE_DEFS.find((d) => d.key === moduleKey)
  if (!def) return false
  if (!def.featureKey) return true
  return features[def.featureKey] === true
}

/**
 * Strip module permissions that the company plan does not include.
 */
export function stripPermissionsOutsidePlan(
  permissions: Record<string, boolean>,
  features: Record<string, boolean>
): Record<string, boolean> {
  const next = { ...permissions }
  for (const def of COMPANY_MODULE_DEFS) {
    if (!def.featureKey) continue
    if (features[def.featureKey] === true) continue
    if (def.viewKey) next[def.viewKey] = false
    if (def.manageKey) next[def.manageKey] = false
    if (def.legacyKey) next[def.legacyKey] = false
    if (def.key === 'payroll') {
      next.can_authorize_payroll = false
    }
  }
  return next
}

/**
 * Build permissions for create/update from role defaults + optional module grants + salary toggle.
 */
export function buildCompanyUserPermissions(input: {
  role: CompanyManagedRole
  moduleGrants?: Partial<Record<CompanyModuleKey, ModuleGrant>>
  canViewSalary?: boolean | null
  companyFeatures: Record<string, boolean>
  existingRaw?: Record<string, unknown> | null
}): Record<string, boolean> {
  const base = {
    ...normalizePermissionsToCanonical(input.role, input.existingRaw || {}),
  } as CanonicalPermissions & Record<string, boolean>

  const grants = input.moduleGrants || {}

  for (const def of COMPANY_MODULE_DEFS) {
    const grant = grants[def.key]
    if (!grant) continue

    const enabled = isModuleEnabledByFeatures(def.key, input.companyFeatures)
    if (!enabled) {
      if (def.viewKey) base[def.viewKey] = false
      if (def.manageKey) base[def.manageKey] = false
      if (def.legacyKey) base[def.legacyKey] = false
      continue
    }

    if (def.legacyKey) {
      if (typeof grant.view === 'boolean') base[def.legacyKey] = grant.view
      continue
    }

    if (def.viewKey && typeof grant.view === 'boolean') {
      base[def.viewKey] = grant.view
    }
    if (def.manageKey && typeof grant.manage === 'boolean') {
      base[def.manageKey] = grant.manage
      if (grant.manage && def.viewKey) base[def.viewKey] = true
    }
  }

  let next = stripPermissionsOutsidePlan(base, input.companyFeatures)
  // Re-normalize so role hard rules (e.g. manager: no payroll) stick after grants.
  next = { ...normalizePermissionsToCanonical(input.role, next) } as Record<string, boolean>
  // Preserve legacy module flags that canonical normalizer does not know about.
  for (const def of COMPANY_MODULE_DEFS) {
    if (!def.legacyKey) continue
    if (typeof base[def.legacyKey] === 'boolean') {
      next[def.legacyKey] = base[def.legacyKey]
    }
  }
  next = stripPermissionsOutsidePlan(next, input.companyFeatures)
  next = applySalaryPermissionRules(input.role, next, input.canViewSalary)
  return next
}

/** Defaults for UI toggles from role + current permissions. */
export function moduleGrantsFromPermissions(
  role: unknown,
  raw: unknown,
  features: Record<string, boolean>
): Record<CompanyModuleKey, ModuleGrant> {
  const canonical = normalizePermissionsToCanonical(role, raw)
  const input =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {}

  const out = {} as Record<CompanyModuleKey, ModuleGrant>
  for (const def of COMPANY_MODULE_DEFS) {
    const enabled = isModuleEnabledByFeatures(def.key, features)
    if (def.legacyKey) {
      const v =
        input[def.legacyKey] === true
          ? true
          : input[def.legacyKey] === false
            ? false
            : roleCanEditSalary(role)
      out[def.key] = { view: enabled && v }
      continue
    }
    out[def.key] = {
      view: enabled && def.viewKey ? !!canonical[def.viewKey] : false,
      manage: enabled && def.manageKey ? !!canonical[def.manageKey] : false,
    }
  }
  return out
}

export function isAuthDuplicateUserError(err: unknown): boolean {
  const e = err as { message?: string; code?: string }
  const msg = (e?.message || '').toLowerCase()
  const code = (e?.code || '').toLowerCase()
  return (
    code === 'email_exists' ||
    msg.includes('already been registered') ||
    msg.includes('already registered') ||
    msg.includes('user already exists') ||
    msg.includes('email address is already')
  )
}

export function parseModuleGrantsFromBody(
  body: unknown
): Partial<Record<CompanyModuleKey, ModuleGrant>> | undefined {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return undefined
  const raw = (body as Record<string, unknown>).module_grants
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined

  const out: Partial<Record<CompanyModuleKey, ModuleGrant>> = {}
  for (const def of COMPANY_MODULE_DEFS) {
    const g = (raw as Record<string, unknown>)[def.key]
    if (!g || typeof g !== 'object' || Array.isArray(g)) continue
    const grant: ModuleGrant = {}
    if ((g as ModuleGrant).view === true || (g as ModuleGrant).view === false) {
      grant.view = (g as ModuleGrant).view
    }
    if ((g as ModuleGrant).manage === true || (g as ModuleGrant).manage === false) {
      grant.manage = (g as ModuleGrant).manage
    }
    if (Object.keys(grant).length > 0) out[def.key] = grant
  }
  return Object.keys(out).length > 0 ? out : undefined
}
