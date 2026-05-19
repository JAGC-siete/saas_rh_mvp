/**
 * Field-level security integration-style tests (pure handler logic).
 * Run: npm run test:security
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { resolveSalaryAccessFromSources } from '../lib/security/field-access'
import {
  buildEmployeeWritePayload,
  computeSalaryAggregates,
  shapeEmployee,
  shapeEmployees,
  shapeEmployeeExportReportData,
} from '../lib/security/shape-employee'
import { buildDepartmentStatsPayload } from '../lib/security/shape-departments'
import { applyFieldAccessToReportData } from '../lib/security/apply-field-access-to-report'
import { canExportReports } from '../lib/security/permissions'

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

  it('manager shape strips hourly_rate_reference', () => {
    const fieldCtx = resolveSalaryAccessFromSources({ role: 'manager', permissions: {} })
    const shaped = shapeEmployee(
      { id: '1', base_salary: 12000, hourly_rate_reference: 50 },
      fieldCtx
    )
    assert.equal(shaped.base_salary, undefined)
    assert.equal(shaped.hourly_rate_reference, undefined)
    assert.equal(shaped.base_salary_masked, true)
  })

  it('computeSalaryAggregates omits totals for manager', () => {
    const fieldCtx = resolveSalaryAccessFromSources({ role: 'manager', permissions: {} })
    const agg = computeSalaryAggregates([{ base_salary: 10000 }, { base_salary: 8000 }], fieldCtx)
    assert.equal(agg.totalPayroll, undefined)
    assert.equal(agg.averageSalary, undefined)
  })

  it('shapeEmployeeExportReportData redacts salary stats', () => {
    const fieldCtx = resolveSalaryAccessFromSources({ role: 'manager', permissions: {} })
    const shaped = shapeEmployeeExportReportData(
      {
        employees: [{ id: '1', base_salary: 5000, hourly_rate_reference: 20 }],
        stats: { totalEmployees: 1, totalSalary: 5000, averageSalary: 5000 },
        departmentStats: [{ department: { name: 'Ops' }, totalSalary: 5000 }],
      },
      fieldCtx
    )
    assert.equal(shaped.employees[0].base_salary, undefined)
    assert.equal(shaped.stats?.totalSalary, undefined)
    assert.equal(shaped.departmentStats?.[0].totalSalary, undefined)
  })

  it('applyFieldAccessToReportData redacts payroll amounts', () => {
    const fieldCtx = resolveSalaryAccessFromSources({ role: 'manager', permissions: {} })
    const out = applyFieldAccessToReportData(
      {
        employees: [{ id: '1', base_salary: 9000 }],
        stats: { totalPayroll: 9000 },
        payroll: [{ net_salary: 7500, gross_salary: 9000 }],
      },
      fieldCtx
    )
    assert.equal((out.employees as Array<Record<string, unknown>>)[0].base_salary, undefined)
    assert.equal((out.stats as Record<string, unknown>).totalPayroll, undefined)
    assert.equal((out.payroll as Array<Record<string, unknown>>)[0].net_salary, undefined)
  })

  it('manager cannot export by default role', () => {
    assert.equal(canExportReports('manager', { permissions: {} }), false)
    assert.equal(
      canExportReports('manager', { permissions: { can_export_reports: true } }),
      true
    )
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
