/**
 * Field-level security integration-style tests (pure handler logic).
 * Run: npm run test:security
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { resolveSalaryAccessFromSources } from '../lib/security/field-access'
import { buildEmployeeWritePayload, shapeEmployees } from '../lib/security/shape-employee'
import { buildDepartmentStatsPayload } from '../lib/security/shape-departments'

describe('field-level-security-read', () => {
  it('manager GET shape: base_salary absent and base_salary_masked true', () => {
    const fieldCtx = resolveSalaryAccessFromSources({ role: 'manager', permissions: {} })
    const employees = [
      { id: '1', name: 'Alexandra', base_salary: 13500 },
      { id: '2', name: 'Carlos', base_salary: 9800 },
    ]

    const shaped = shapeEmployees(employees, fieldCtx)

    for (const emp of shaped) {
      assert.equal(emp.base_salary, undefined)
      assert.equal(emp.base_salary_masked, true)
    }
  })

  it('manager departments stats: no base_salary in employees or salary aggregates', () => {
    const fieldCtx = resolveSalaryAccessFromSources({ role: 'manager', permissions: {} })
    const departments = [{ id: 'd1', name: 'MP', description: null }]
    const employees = [
      { id: '1', name: 'Alexandra', base_salary: 13500, department_id: 'd1', status: 'active' },
    ]

    const { departmentStats, summary } = buildDepartmentStatsPayload(
      departments,
      employees,
      fieldCtx
    )

    const mp = departmentStats.MP as Record<string, unknown>
    assert.equal(summary.totalSalary, undefined)
    assert.equal(summary.averageSalary, undefined)
    assert.equal(mp.totalSalary, undefined)
    assert.equal(mp.averageSalary, undefined)

    const listed = mp.employees as Array<Record<string, unknown>>
    assert.equal(listed[0].base_salary, undefined)
    assert.equal(listed[0].base_salary_masked, true)
  })

  it('hr_manager departments stats: includes salary aggregates', () => {
    const fieldCtx = resolveSalaryAccessFromSources({ role: 'hr_manager', permissions: {} })
    const departments = [{ id: 'd1', name: 'MP', description: null }]
    const employees = [
      { id: '1', name: 'Alexandra', base_salary: 13500, department_id: 'd1', status: 'active' },
    ]

    const { departmentStats, summary } = buildDepartmentStatsPayload(
      departments,
      employees,
      fieldCtx
    )

    const mp = departmentStats.MP as Record<string, unknown>
    assert.equal(summary.totalSalary, 13500)
    assert.equal(mp.totalSalary, 13500)
    const listed = mp.employees as Array<Record<string, unknown>>
    assert.equal(listed[0].base_salary, 13500)
  })
})

describe('field-level-security-write', () => {
  it('manager PUT: base_salary stripped from update payload', () => {
    const fieldCtx = resolveSalaryAccessFromSources({ role: 'manager', permissions: {} })
    const originalSalary = 13500

    const payload = buildEmployeeWritePayload(
      { id: 'emp-1', name: 'Updated Name', base_salary: 99999 },
      fieldCtx
    )

    assert.equal(payload.name, 'Updated Name')
    assert.equal(payload.base_salary, undefined)

    // Simulated DB: only allowed fields applied — salary unchanged
    const dbRow = { id: 'emp-1', name: 'Alexandra', base_salary: originalSalary }
    const afterUpdate = { ...dbRow, ...(payload as { name?: string }) }
    assert.equal(afterUpdate.base_salary, originalSalary)
    assert.equal(afterUpdate.name, 'Updated Name')
  })
})
