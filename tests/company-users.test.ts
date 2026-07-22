/**
 * Company-scoped user permission rules.
 * Run: npx tsx --test tests/company-users.test.ts
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  applySalaryPermissionRules,
  assignableRolesForActor,
  buildCompanyUserPermissions,
  canActorAssignRole,
  canActorManageTarget,
  isCompanyManagedRole,
  isModuleAssignableForRole,
  isModuleToggleEnabled,
  roleCanEditSalary,
  stripPermissionsOutsidePlan,
} from '../lib/company/users'

describe('company-users salary rules', () => {
  it('company_admin and hr_manager always get view+edit salary', () => {
    for (const role of ['company_admin', 'hr_manager'] as const) {
      const perms = applySalaryPermissionRules(role, {}, false)
      assert.equal(perms.can_edit_salary, true)
      assert.equal(perms.can_view_salary, true)
      assert.equal(roleCanEditSalary(role), true)
    }
  })

  it('manager/employee never get can_edit_salary even if requested', () => {
    for (const role of ['manager', 'employee'] as const) {
      const withView = applySalaryPermissionRules(role, { can_edit_salary: true }, true)
      assert.equal(withView.can_edit_salary, false)
      assert.equal(withView.can_view_salary, true)

      const withoutView = applySalaryPermissionRules(role, { can_edit_salary: true }, false)
      assert.equal(withoutView.can_edit_salary, false)
      assert.equal(withoutView.can_view_salary, false)
    }
  })
})

describe('company-users roles', () => {
  it('accepts only company managed roles', () => {
    assert.equal(isCompanyManagedRole('company_admin'), true)
    assert.equal(isCompanyManagedRole('hr_manager'), true)
    assert.equal(isCompanyManagedRole('manager'), true)
    assert.equal(isCompanyManagedRole('employee'), true)
    assert.equal(isCompanyManagedRole('super_admin'), false)
    assert.equal(isCompanyManagedRole('admin'), false)
  })

  it('hr_manager cannot assign or manage company_admin', () => {
    assert.equal(canActorAssignRole('hr_manager', 'company_admin'), false)
    assert.equal(canActorAssignRole('hr_manager', 'manager'), true)
    assert.equal(canActorManageTarget('hr_manager', 'company_admin'), false)
    assert.equal(canActorManageTarget('hr_manager', 'employee'), true)
    assert.deepEqual(assignableRolesForActor('hr_manager'), [
      'hr_manager',
      'manager',
      'employee',
    ])
  })

  it('company_admin can assign all managed roles', () => {
    assert.equal(canActorAssignRole('company_admin', 'company_admin'), true)
    assert.equal(canActorManageTarget('company_admin', 'company_admin'), true)
    assert.equal(assignableRolesForActor('company_admin').includes('company_admin'), true)
  })
})

describe('company-users plan stripping', () => {
  it('clears payroll permissions when feature disabled', () => {
    const stripped = stripPermissionsOutsidePlan(
      {
        can_view_payroll: true,
        can_manage_payroll: true,
        can_authorize_payroll: true,
        can_view_employees: true,
      },
      { payroll: false, employees: true }
    )
    assert.equal(stripped.can_view_payroll, false)
    assert.equal(stripped.can_manage_payroll, false)
    assert.equal(stripped.can_authorize_payroll, false)
    assert.equal(stripped.can_view_employees, true)
  })
})

describe('company-users module honesty', () => {
  it('manager cannot toggle payroll/settings/reports', () => {
    assert.equal(isModuleAssignableForRole('manager', 'payroll'), false)
    assert.equal(isModuleAssignableForRole('manager', 'settings'), false)
    assert.equal(isModuleAssignableForRole('manager', 'attendance'), true)
    assert.equal(
      isModuleToggleEnabled('manager', 'payroll', { payroll: true }),
      false
    )
  })
})

describe('company-users build permissions', () => {
  const features = {
    employees: true,
    departments: true,
    attendance: true,
    payroll: true,
    reports: true,
    mtp_job_descriptions: true,
    performance_evaluations: false,
  }

  it('manager with view salary toggle does not get edit', () => {
    const perms = buildCompanyUserPermissions({
      role: 'manager',
      canViewSalary: true,
      companyFeatures: features,
      moduleGrants: {
        employees: { view: true, manage: false },
        payroll: { view: true, manage: true },
      },
    })
    assert.equal(perms.can_view_salary, true)
    assert.equal(perms.can_edit_salary, false)
    assert.equal(perms.can_view_payroll, false)
    assert.equal(perms.can_manage_payroll, false)
  })

  it('does not grant performance when feature off', () => {
    const perms = buildCompanyUserPermissions({
      role: 'company_admin',
      canViewSalary: true,
      companyFeatures: features,
      moduleGrants: {
        performance: { view: true },
        employees: { view: true, manage: true },
      },
    })
    assert.equal(perms.performance, false)
    assert.equal(perms.can_manage_employees, true)
    assert.equal(perms.can_edit_salary, true)
  })

  it('employee without salary view stays masked', () => {
    const perms = buildCompanyUserPermissions({
      role: 'employee',
      canViewSalary: false,
      companyFeatures: features,
    })
    assert.equal(perms.can_view_salary, false)
    assert.equal(perms.can_edit_salary, false)
  })
})
