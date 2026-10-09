import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  NAVIGATION,
  allNavItems,
  filterNavigation,
  findActiveItem,
  findGroupOf,
  type NavPermissions,
} from '../lib/navigation/sidebar'
import { badgesFromPending } from '../lib/navigation/sidebar'
import { computeNavPermissions } from '../lib/navigation/permissions'

const ALL: NavPermissions = {
  dashboard: true, employees: true, departments: true, attendance: true, leave: true,
  payroll: true, deducciones: true, reports: true, settings: true, mtp: true, performance: true,
}

describe('NAVIGATION', () => {
  it('keeps every route of the previous sidebar', () => {
    const hrefs = allNavItems(NAVIGATION).map((i) => i.href).sort()
    assert.deepEqual(hrefs, [
      '/app/13-14-salario', '/app/accounting', '/app/attendance/dashboard', '/app/cesantias', '/app/dashboard',
      '/app/deducciones', '/app/departments', '/app/employees', '/app/leave', '/app/mtp', '/app/payroll',
      '/app/performance-evaluations', '/app/reports', '/app/settings', '/app/support',
    ])
  })

  it('has unique ids', () => {
    const ids = allNavItems(NAVIGATION).map((i) => i.id)
    assert.equal(new Set(ids).size, ids.length)
  })
})

describe('filterNavigation', () => {
  it('hides items by role and drops empty groups', () => {
    const nav = filterNavigation(NAVIGATION, { ...ALL, payroll: false, deducciones: false, reports: false }, {}, false)
    assert.deepEqual(nav.groups.map((g) => g.id), ['personas', 'tiempo'])
  })

  it('hides items whose plan feature is off, but not while the feature matrix is loading', () => {
    const off = filterNavigation(NAVIGATION, ALL, { cesantias: false }, false)
    assert.ok(!allNavItems(off).some((i) => i.id === 'cesantias'))
    const loading = filterNavigation(NAVIGATION, ALL, null, false)
    assert.ok(allNavItems(loading).some((i) => i.id === 'cesantias'))
  })

  it('hides sensitive modules while permissions resolve', () => {
    const nav = filterNavigation(NAVIGATION, ALL, null, true)
    const ids = allNavItems(nav).map((i) => i.id)
    for (const hidden of ['nomina', 'deducciones', 'reportes', 'puestos', 'evaluaciones']) assert.ok(!ids.includes(hidden), hidden)
    assert.ok(ids.includes('asistencia'))
  })
})

describe('findActiveItem', () => {
  it('marks the section on subpages', () => {
    assert.equal(findActiveItem(NAVIGATION, '/app/attendance/corrections')?.id, 'asistencia')
    assert.equal(findActiveItem(NAVIGATION, '/app/employees/123?tab=files')?.id, 'empleados')
    assert.equal(findActiveItem(NAVIGATION, '/app/payroll')?.id, 'nomina')
  })

  it('does not match on a shared string prefix', () => {
    assert.equal(findActiveItem(NAVIGATION, '/app/payroll-old'), null)
    assert.equal(findActiveItem(NAVIGATION, '/app/notifications'), null)
  })

  it('finds the group of the active item', () => {
    assert.equal(findGroupOf(NAVIGATION, 'vacaciones')?.label, 'Tiempo')
    assert.equal(findGroupOf(NAVIGATION, 'inicio'), null)
  })
})

describe('badgesFromPending', () => {
  it('maps dashboard pending items to menu items', () => {
    const badges = badgesFromPending([
      { id: 'open_punches', count: 3 },
      { id: 'corrections', count: 2 },
      { id: 'leave_requests', count: 4 },
      { id: 'payroll_run', count: 1 },
      { id: 'terminations', count: 5 },
    ] as any)
    assert.deepEqual(badges, { asistencia: 5, vacaciones: 4, nomina: 1 })
  })
})

describe('computeNavPermissions', () => {
  it('gives payroll modules to company admins but not to managers', () => {
    assert.equal(computeNavPermissions({ role: 'company_admin' }).payroll, true)
    const manager = computeNavPermissions({ role: 'manager' })
    assert.equal(manager.payroll, false)
    assert.equal(manager.mtp, false)
  })

  it('accepts permissions stored as a JSON string', () => {
    assert.doesNotThrow(() => computeNavPermissions({ role: 'hr_manager', permissions: '{"mtp": false}' }))
    assert.equal(computeNavPermissions({ role: 'hr_manager', permissions: '{"mtp": false}' }).mtp, false)
  })
})
