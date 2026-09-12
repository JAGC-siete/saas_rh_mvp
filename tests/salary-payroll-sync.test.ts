/**
 * Salary → payroll sync: period ordinary, OT rate, frozen runs, history delta.
 * Run: npx tsx --test tests/salary-payroll-sync.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { calculatePeriodBaseSalary } from '../lib/payroll/calculate-period-base-salary'
import { HONDURAS_LABOR_FACTOR } from '../lib/payroll/constants'
import { calculateOvertimePayFromAhc } from '../lib/payroll/overtime-pay'
import { computeFixedGrossFromDays, normalizePayrollDaysWorked } from '../lib/payroll/fixed-line-recalc'
import {
  isFrozenPayrollRunStatus,
  isMutablePayrollRunStatus,
} from '../lib/payroll/resolve-effective-pay-type'
import {
  lineBaseSalaryDriftedFromEmployee,
  payrollLineMasterDataDrifted,
  resolveSnapshotMonthlySalary,
} from '../lib/payroll/salary-snapshot'
import { shouldPreservePayrollLineOnPreview } from '../lib/payroll/preview-preserve-line'
import {
  buildSalaryHistoryInsert,
  salaryAmountsDiffer,
} from '../lib/employees/salary-history'

describe('period ordinary from monthly base_salary', () => {
  it('quincenal fixed = monthly / 2', () => {
    assert.equal(
      calculatePeriodBaseSalary({ base_salary: 16500, pay_type: 'fixed' }, 'quincenal'),
      8250
    )
  })

  it('mensual fixed = monthly', () => {
    assert.equal(
      calculatePeriodBaseSalary({ base_salary: 16500, pay_type: 'fixed' }, 'mensual'),
      16500
    )
  })

  it('preview biweekly full-period gross uses company frequency not employee mensual ficha', () => {
    const gross = computeFixedGrossFromDays({
      baseSalary: 16500,
      daysWorked: 15,
      paymentFrequency: 'biweekly',
      diasPeriodo: 15,
      ultimoDiaCalendario: 31,
      isMonthlyCalendarStandard: false,
      semanalProration: 'proportional',
    })
    assert.equal(gross, 8250)
  })

  it('biweekly 14.5 days prorates against 15 (not truncated to 14)', () => {
    const full = computeFixedGrossFromDays({
      baseSalary: 16500,
      daysWorked: 15,
      paymentFrequency: 'biweekly',
      diasPeriodo: 15,
      ultimoDiaCalendario: 31,
      isMonthlyCalendarStandard: false,
      semanalProration: 'proportional',
    })
    const halfDay = computeFixedGrossFromDays({
      baseSalary: 16500,
      daysWorked: 14.5,
      paymentFrequency: 'biweekly',
      diasPeriodo: 15,
      ultimoDiaCalendario: 31,
      isMonthlyCalendarStandard: false,
      semanalProration: 'proportional',
    })
    const truncated = computeFixedGrossFromDays({
      baseSalary: 16500,
      daysWorked: 14,
      paymentFrequency: 'biweekly',
      diasPeriodo: 15,
      ultimoDiaCalendario: 31,
      isMonthlyCalendarStandard: false,
      semanalProration: 'proportional',
    })
    assert.equal(full, 8250)
    assert.equal(halfDay, 8250 * (14.5 / 15))
    assert.equal(truncated, 8250 * (14 / 15))
    assert.ok(halfDay > truncated)
    assert.ok(halfDay < full)
  })
})

describe('normalizePayrollDaysWorked', () => {
  it('keeps 14.5 instead of truncating like parseInt', () => {
    assert.equal(normalizePayrollDaysWorked(14.5), 14.5)
    assert.equal(normalizePayrollDaysWorked('14.5'), 14.5)
    assert.equal(normalizePayrollDaysWorked('14,5'), 14.5)
    assert.equal(parseInt('14.5', 10), 14)
  })

  it('rejects negatives and non-numeric', () => {
    assert.equal(normalizePayrollDaysWorked(-1), null)
    assert.equal(normalizePayrollDaysWorked('abc'), null)
    assert.equal(normalizePayrollDaysWorked(''), null)
    assert.equal(normalizePayrollDaysWorked(null), null)
  })
})

describe('overtime hourly rate Honduras 240', () => {
  it('recalculates HE pay when monthly salary changes', () => {
    const hours = {
      evening_25: 2,
      night_50: 0,
      late_75: 0,
      morning_25: 0,
      holiday_100: 0,
    }
    const oldPay = calculateOvertimePayFromAhc(hours, 15500 / HONDURAS_LABOR_FACTOR)
    const newPay = calculateOvertimePayFromAhc(hours, 16500 / HONDURAS_LABOR_FACTOR)
    assert.equal(oldPay, Math.round(2 * (15500 / 240) * 1.25 * 100) / 100)
    assert.equal(newPay, Math.round(2 * (16500 / 240) * 1.25 * 100) / 100)
    assert.ok(newPay > oldPay)
  })
})

describe('draft regenerates; authorized does not', () => {
  it('salary drift on edited draft line skips preserve', () => {
    assert.equal(
      shouldPreservePayrollLineOnPreview(
        {
          id: 'line-1',
          edited: true,
          metadata: { pay_type: 'fixed', base_salary_used: 15500 },
        },
        { currentEffectivePayType: 'fixed', currentBaseSalary: 16500 }
      ),
      false
    )
  })

  it('authorized / distributed / paid are frozen; draft / edited / pending are mutable', () => {
    assert.equal(isFrozenPayrollRunStatus('authorized'), true)
    assert.equal(isFrozenPayrollRunStatus('distributed'), true)
    assert.equal(isFrozenPayrollRunStatus('paid'), true)
    assert.equal(isFrozenPayrollRunStatus('draft'), false)
    assert.equal(isMutablePayrollRunStatus('draft'), true)
    assert.equal(isMutablePayrollRunStatus('edited'), true)
    assert.equal(isMutablePayrollRunStatus('pending'), true)
    assert.equal(isMutablePayrollRunStatus('authorized'), false)
  })

  it('frozen display uses stamped salary when live drifted', () => {
    assert.equal(
      resolveSnapshotMonthlySalary(16500, { base_salary_used: 15500 }),
      15500
    )
    assert.equal(lineBaseSalaryDriftedFromEmployee(15500, 16500), true)
    assert.equal(
      payrollLineMasterDataDrifted({
        employeePayType: 'fixed',
        metadataPayType: 'fixed',
        liveBaseSalary: 16500,
        stampedBaseSalary: 15500,
      }),
      true
    )
  })
})

describe('salary history delta', () => {
  it('detects change and builds insert with old/new amounts', () => {
    assert.equal(salaryAmountsDiffer(15500, 16500), true)
    assert.equal(salaryAmountsDiffer(16500, 16500), false)
    const row = buildSalaryHistoryInsert({
      employee_id: 'emp-1',
      company_id: 'c419b1a5-32de-4518-8ff2-e7ebd6318a9f',
      old_amount: 15500,
      new_amount: 16500,
      effective_from: '2026-08-14T19:00:00.000Z',
      changed_by: 'user-1',
    })
    assert.equal(row.old_amount, 15500)
    assert.equal(row.new_amount, 16500)
    assert.equal(row.employee_id, 'emp-1')
    assert.equal(row.changed_by, 'user-1')
    assert.equal(row.effective_from, '2026-08-14T19:00:00.000Z')
  })

  it('records initial hire as old_amount null', () => {
    const row = buildSalaryHistoryInsert({
      employee_id: 'emp-1',
      company_id: 'co-1',
      old_amount: null,
      new_amount: 14000,
      changed_by: 'user-1',
    })
    assert.equal(row.old_amount, null)
    assert.equal(row.new_amount, 14000)
    assert.ok(typeof row.effective_from === 'string')
  })
})
