import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  canAccessDeduccionesModule,
  canCancelDeductionPlans,
  canSearchEmployeesForDeducciones,
  isDeduccionesOnlyAccess,
  CANCEL_DEDUCTION_PLANS_KEY,
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

  it('does not treat manager with employees/attendance as deductions-only', () => {
    assert.equal(
      isDeduccionesOnlyAccess('manager', {
        can_manage_deducciones: true,
        can_view_employees: true,
        can_manage_employees: true,
        can_view_attendance: true,
        can_manage_attendance: true,
        can_access_dashboard: true,
      }),
      false
    )
  })

  it('treats provisioned deductions-only manager as deductions-only', () => {
    assert.equal(
      isDeduccionesOnlyAccess('manager', {
        can_manage_deducciones: true,
        can_access_dashboard: false,
        can_view_employees: false,
        can_manage_employees: false,
        can_view_attendance: false,
        can_manage_attendance: false,
        can_view_departments: false,
        can_request_leave: false,
        can_approve_leave: false,
      }),
      true
    )
  })
  it('denies cancel when can_cancel_deduction_plans is false', () => {
    assert.equal(
      canCancelDeductionPlans('manager', {
        can_manage_deducciones: true,
        [CANCEL_DEDUCTION_PLANS_KEY]: false,
      }),
      false
    )
    assert.equal(
      canCancelDeductionPlans('manager', {
        can_manage_deducciones: true,
      }),
      true
    )
    assert.equal(canCancelDeductionPlans('company_admin', {}), true)
  })
})

