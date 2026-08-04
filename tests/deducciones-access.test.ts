import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  canAccessDeduccionesModule,
  canSearchEmployeesForDeducciones,
} from '../lib/security/deducciones-access'
import { normalizePermissionsToCanonical } from '../lib/security/canonical-permissions'

describe('deducciones access', () => {
  it('grants payroll roles by default', () => {
    assert.equal(canAccessDeduccionesModule('hr_manager', {}), true)
    assert.equal(canAccessDeduccionesModule('company_admin', {}), true)
  })

  it('denies plain manager', () => {
    assert.equal(canAccessDeduccionesModule('manager', {}), false)
  })

  it('allows manager with can_manage_deducciones only', () => {
    const perms = {
      can_manage_deducciones: true,
      can_access_dashboard: false,
      can_view_employees: false,
      can_view_attendance: false,
      can_manage_attendance: false,
      can_view_attendance_reports: false,
      can_export_attendance_reports: false,
      can_request_leave: false,
      can_approve_leave: false,
    }
    assert.equal(canAccessDeduccionesModule('manager', perms), true)
    const canonical = normalizePermissionsToCanonical('manager', perms)
    assert.equal(canonical.can_view_payroll, false)
    assert.equal(canonical.can_manage_deducciones, true)
    assert.equal(canonical.can_view_employees, false)
  })

  it('allows employee search for deductions-only managers without employees module', () => {
    assert.equal(
      canSearchEmployeesForDeducciones('manager', {
        can_view_employees: false,
        can_manage_deducciones: true,
      }),
      true
    )
    assert.equal(
      canSearchEmployeesForDeducciones('manager', {
        can_view_employees: false,
        can_manage_deducciones: false,
      }),
      false
    )
  })
})

