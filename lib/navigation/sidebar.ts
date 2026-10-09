/**
 * Menú lateral de /app: estructura (grupos), filtro por permisos de rol y plan, y sección activa.
 * Sin dependencias de React para poder probarlo (tests/sidebar-navigation.test.ts).
 */

import type { PendingItem } from '../dashboard/overview'

export type NavPermission =
  | 'dashboard'
  | 'employees'
  | 'departments'
  | 'attendance'
  | 'leave'
  | 'payroll'
  | 'deducciones'
  | 'reports'
  | 'settings'
  | 'mtp'
  | 'performance'

export type NavPermissions = Partial<Record<NavPermission, boolean>>

export type NavIconKey =
  | 'home' | 'users' | 'building' | 'evaluations' | 'jobs' | 'clock' | 'leave'
  | 'payroll' | 'deductions' | 'severance' | 'bonus' | 'accounting' | 'reports'
  | 'settings' | 'support'

export interface NavItem {
  id: string
  label: string
  href: string
  icon: NavIconKey
  permission: NavPermission
  /** Clave de has_feature() del plan; sin ella el ítem depende solo del rol. */
  featureKey?: string
  /** Prefijos de ruta que cuentan como esta sección (subpáginas). Por defecto, `href`. */
  match?: string[]
}

export interface NavGroup {
  id: string
  label: string
  items: NavItem[]
}

export interface NavStructure {
  top: NavItem[]
  groups: NavGroup[]
  footer: NavItem[]
}

/** Se ocultan mientras se resuelven los permisos (fail-safe para módulos sensibles). */
export const GUARD_WHILE_RESOLVING: NavPermission[] = ['payroll', 'deducciones', 'reports', 'mtp', 'performance']

export const NAVIGATION: NavStructure = {
  top: [{ id: 'inicio', label: 'Inicio', href: '/app/dashboard', icon: 'home', permission: 'dashboard' }],
  groups: [
    {
      id: 'personas',
      label: 'Personas',
      items: [
        { id: 'empleados', label: 'Empleados', href: '/app/employees', icon: 'users', permission: 'employees', featureKey: 'employees' },
        { id: 'departamentos', label: 'Departamentos', href: '/app/departments', icon: 'building', permission: 'departments', featureKey: 'departments' },
        {
          id: 'evaluaciones',
          label: 'Evaluaciones',
          href: '/app/performance-evaluations',
          icon: 'evaluations',
          permission: 'performance',
          featureKey: 'performance_evaluations',
        },
        { id: 'puestos', label: 'Descripciones de puesto', href: '/app/mtp', icon: 'jobs', permission: 'mtp', featureKey: 'mtp_job_descriptions' },
      ],
    },
    {
      id: 'tiempo',
      label: 'Tiempo',
      items: [
        {
          id: 'asistencia',
          label: 'Asistencia',
          href: '/app/attendance/dashboard',
          icon: 'clock',
          permission: 'attendance',
          featureKey: 'attendance',
          match: ['/app/attendance'],
        },
        { id: 'vacaciones', label: 'Vacaciones y permisos', href: '/app/leave', icon: 'leave', permission: 'leave' },
      ],
    },
    {
      id: 'nomina',
      label: 'Nómina',
      items: [
        { id: 'nomina', label: 'Nómina', href: '/app/payroll', icon: 'payroll', permission: 'payroll', featureKey: 'payroll' },
        { id: 'deducciones', label: 'Deducciones', href: '/app/deducciones', icon: 'deductions', permission: 'deducciones', featureKey: 'deducciones' },
        { id: 'cesantias', label: 'Cesantías', href: '/app/cesantias', icon: 'severance', permission: 'payroll', featureKey: 'cesantias' },
        { id: 'decimos', label: '13.º y 14.º salario', href: '/app/13-14-salario', icon: 'bonus', permission: 'payroll', featureKey: 'decimo_13_14' },
        { id: 'contabilidad', label: 'Contabilidad', href: '/app/accounting', icon: 'accounting', permission: 'payroll', featureKey: 'contabilidad' },
      ],
    },
    {
      id: 'analisis',
      label: 'Análisis',
      items: [{ id: 'reportes', label: 'Reportes', href: '/app/reports', icon: 'reports', permission: 'reports', featureKey: 'reports' }],
    },
  ],
  footer: [
    { id: 'configuracion', label: 'Configuración', href: '/app/settings', icon: 'settings', permission: 'settings' },
    { id: 'soporte', label: 'Soporte', href: '/app/support', icon: 'support', permission: 'dashboard' },
  ],
}

export function isNavItemVisible(
  item: NavItem,
  permissions: NavPermissions,
  features: Record<string, boolean> | null,
  resolving: boolean
): boolean {
  if (resolving && GUARD_WHILE_RESOLVING.includes(item.permission)) return false
  // Por rol: se oculta solo con false explícito (undefined = visible).
  if (permissions[item.permission] === false) return false
  // Por plan: mientras no hay matriz (null) no se oculta, para no vaciar el menú al cargar.
  if (item.featureKey && features !== null && features[item.featureKey] === false) return false
  return true
}

export function filterNavigation(
  nav: NavStructure,
  permissions: NavPermissions,
  features: Record<string, boolean> | null,
  resolving: boolean
): NavStructure {
  const keep = (items: NavItem[]) => items.filter((i) => isNavItemVisible(i, permissions, features, resolving))
  return {
    top: keep(nav.top),
    groups: nav.groups.map((g) => ({ ...g, items: keep(g.items) })).filter((g) => g.items.length > 0),
    footer: keep(nav.footer),
  }
}

export function allNavItems(nav: NavStructure): NavItem[] {
  return [...nav.top, ...nav.groups.flatMap((g) => g.items), ...nav.footer]
}

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

/** Sección activa: la de prefijo más largo que coincide con la ruta (incluye subpáginas). */
export function findActiveItem(nav: NavStructure, pathname: string): NavItem | null {
  const path = pathname.split('?')[0].split('#')[0]
  let best: { item: NavItem; len: number } | null = null
  for (const item of allNavItems(nav)) {
    for (const prefix of item.match ?? [item.href]) {
      if (matchesPrefix(path, prefix) && (!best || prefix.length > best.len)) {
        best = { item, len: prefix.length }
      }
    }
  }
  return best?.item ?? null
}

export function findGroupOf(nav: NavStructure, itemId: string | null | undefined): NavGroup | null {
  if (!itemId) return null
  return nav.groups.find((g) => g.items.some((i) => i.id === itemId)) ?? null
}

/** Qué pendiente del dashboard se cuenta en qué ítem del menú. */
const PENDING_TO_NAV: Record<PendingItem['id'], string | null> = {
  open_punches: 'asistencia',
  corrections: 'asistencia',
  leave_requests: 'vacaciones',
  payroll_run: 'nomina',
  terminations: null,
}

export function badgesFromPending(pending: PendingItem[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const p of pending) {
    const navId = PENDING_TO_NAV[p.id]
    if (navId && p.count > 0) out[navId] = (out[navId] ?? 0) + p.count
  }
  return out
}
