import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { resolveSalaryAccessFromSources } from '../lib/security/field-access'
import {
  buildEmployeeWritePayload,
  shapeEmployee,
  shapeEmployees,
} from '../lib/security/shape-employee'

describe('shapeEmployees', () => {
  it('omits base_salary and sets masked flag when canViewSalary is false', () => {
    const rows = Array.from({ length: 500 }, (_, i) => ({
      id: `emp-${i}`,
      name: `Employee ${i}`,
      base_salary: 13500 + i,
    }))

    const ctx = {
      canViewSalary: false,
      canEditSalary: false,
      salaryDisplayMode: 'masked' as const,
    }

    const shaped = shapeEmployees(rows, ctx)
    assert.equal(shaped.length, 500)
    for (const row of shaped) {
      assert.equal(row.base_salary, undefined)
      assert.equal(row.base_salary_masked, true)
      assert.equal(row.name, row.name)
    }
  })

  it('preserves base_salary when canViewSalary is true', () => {
    const emp = { id: '1', name: 'Test', base_salary: 12000 }
    const shaped = shapeEmployee(emp, {
      canViewSalary: true,
      canEditSalary: true,
      salaryDisplayMode: 'masked',
    })
    assert.equal(shaped.base_salary, 12000)
    assert.equal(shaped.base_salary_masked, undefined)
  })
})

describe('buildEmployeeWritePayload', () => {
  it('strips base_salary when canEditSalary is false', () => {
    const payload = buildEmployeeWritePayload(
      { id: 'x', name: 'Updated', base_salary: 99999 },
      { canViewSalary: false, canEditSalary: false, salaryDisplayMode: 'masked' }
    )
    assert.equal(payload.name, 'Updated')
    assert.equal(payload.base_salary, undefined)
  })

  it('allows base_salary when canEditSalary is true', () => {
    const payload = buildEmployeeWritePayload(
      { name: 'Updated', base_salary: 15000 },
      { canViewSalary: true, canEditSalary: true, salaryDisplayMode: 'masked' }
    )
    assert.equal(payload.base_salary, 15000)
  })

  it('rejects masked salary strings', () => {
    assert.throws(
      () =>
        buildEmployeeWritePayload(
          { base_salary: 'L. *******' },
          { canViewSalary: true, canEditSalary: true, salaryDisplayMode: 'masked' }
        ),
      /INVALID_BASE_SALARY/
    )
  })
})

describe('resolveSalaryAccessFromSources', () => {
  it('manager role defaults to no salary access', () => {
    const ctx = resolveSalaryAccessFromSources({ role: 'manager', permissions: {} })
    assert.equal(ctx.canViewSalary, false)
    assert.equal(ctx.canEditSalary, false)
  })

  it('hr_manager role defaults to salary access', () => {
    const ctx = resolveSalaryAccessFromSources({ role: 'hr_manager', permissions: {} })
    assert.equal(ctx.canViewSalary, true)
    assert.equal(ctx.canEditSalary, true)
  })

  it('user override can grant view salary to manager', () => {
    const ctx = resolveSalaryAccessFromSources({
      role: 'manager',
      permissions: { can_view_salary: true },
    })
    assert.equal(ctx.canViewSalary, true)
    assert.equal(ctx.canEditSalary, false)
  })

  it('DB matrix overrides role defaults when no user override', () => {
    const ctx = resolveSalaryAccessFromSources(
      { role: 'manager', permissions: {} },
      { access_level: 'read', display_mode: 'masked' }
    )
    assert.equal(ctx.canViewSalary, true)
    assert.equal(ctx.canEditSalary, false)
  })

  it('resolveFieldAccessContext fail-secure when DB query errors', async () => {
    const failingClient = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: { message: 'relation does not exist' } }),
            }),
          }),
        }),
      }),
    }

    const { resolveFieldAccessContext } = await import('../lib/security/field-access')
    const ctx = await resolveFieldAccessContext({ role: 'hr_manager', permissions: {} }, failingClient)
    assert.equal(ctx.canViewSalary, false)
    assert.equal(ctx.canEditSalary, false)
  })
})
