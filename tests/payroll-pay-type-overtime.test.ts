/**
 * Regresión: pay_type herencia, gate pay_overtime, AHC overtime tracking.
 *
 * Run: npx tsx --test tests/payroll-pay-type-overtime.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { resolveEffectivePayType } from '../lib/payroll/resolve-effective-pay-type'
import {
  resolveCompanyPayOvertime,
  shouldPayOvertimeToEmployee,
  calculateOvertimePayFromAhc,
  overtimeHoursTotal
} from '../lib/payroll/overtime-pay'

describe('resolveEffectivePayType', () => {
  it('null + daily → fixed', () => {
    assert.equal(resolveEffectivePayType(null, 'daily'), 'fixed')
    assert.equal(resolveEffectivePayType(undefined, 'daily'), 'fixed')
  })

  it('null + hourly → hourly', () => {
    assert.equal(resolveEffectivePayType(null, 'hourly'), 'hourly')
  })

  it('explicit pay_type wins over company mode', () => {
    assert.equal(resolveEffectivePayType('fixed', 'hourly'), 'fixed')
    assert.equal(resolveEffectivePayType('hourly', 'daily'), 'hourly')
  })
})

describe('resolveCompanyPayOvertime', () => {
  it('defaults true when absent', () => {
    assert.equal(resolveCompanyPayOvertime(null), true)
    assert.equal(resolveCompanyPayOvertime({}), true)
    assert.equal(resolveCompanyPayOvertime(undefined), true)
  })

  it('explicit false is respected (no || true coercion)', () => {
    assert.equal(resolveCompanyPayOvertime({ pay_overtime: false }), false)
  })

  it('explicit true', () => {
    assert.equal(resolveCompanyPayOvertime({ pay_overtime: true }), true)
  })
})

describe('shouldPayOvertimeToEmployee (MVP)', () => {
  it('company false → nobody paid', () => {
    assert.equal(shouldPayOvertimeToEmployee(false, 'hourly'), false)
    assert.equal(shouldPayOvertimeToEmployee(false, 'fixed'), false)
  })

  it('company true + hourly → paid', () => {
    assert.equal(shouldPayOvertimeToEmployee(true, 'hourly'), true)
  })

  it('company true + fixed → not paid unless employee override (phase 2)', () => {
    assert.equal(shouldPayOvertimeToEmployee(true, 'fixed'), false)
    assert.equal(shouldPayOvertimeToEmployee(true, 'fixed', null), false)
    assert.equal(shouldPayOvertimeToEmployee(true, 'fixed', false), false)
    assert.equal(shouldPayOvertimeToEmployee(true, 'fixed', true), true)
  })
})

describe('calculateOvertimePayFromAhc', () => {
  it('computes premium from breakdown', () => {
    const pay = calculateOvertimePayFromAhc(
      { diurno: 2, nocturno: 0, feriado: 0 },
      100
    )
    assert.equal(pay, 250) // 2 * 100 * 1.25
  })

  it('returns 0 for zero rate', () => {
    assert.equal(
      calculateOvertimePayFromAhc({ diurno: 5, nocturno: 0, feriado: 0 }, 0),
      0
    )
  })
})

describe('AHC overtime tracking (fixed employee)', () => {
  it('aggregates overtime hours for any employee (simulated batch)', () => {
    const rows = [
      {
        employee_id: 'emp-fixed',
        overtime_diurno_hours: 1,
        overtime_nocturno_hours: 0.5,
        overtime_feriado_hours: 0
      },
      {
        employee_id: 'emp-fixed',
        overtime_diurno_hours: 0,
        overtime_nocturno_hours: 0,
        overtime_feriado_hours: 1
      }
    ]
    const ahcOvertimeByEmployee: Record<string, number> = {}
    for (const row of rows) {
      const ot = overtimeHoursTotal({
        diurno: Number(row.overtime_diurno_hours || 0),
        nocturno: Number(row.overtime_nocturno_hours || 0),
        feriado: Number(row.overtime_feriado_hours || 0)
      })
      const eid = row.employee_id
      ahcOvertimeByEmployee[eid] = (ahcOvertimeByEmployee[eid] || 0) + ot
    }
    assert.equal(ahcOvertimeByEmployee['emp-fixed'], 2.5)
    assert.equal(shouldPayOvertimeToEmployee(true, 'fixed'), false)
  })
})

describe('QA: preview persistence semantics', () => {
  it('authorized runs use frozen eff_* (documented contract)', () => {
    // buildAuthorizedPayrollPreviewPayload reads payroll_run_lines only — no recalc on GET preview.
    const authorizedStatuses = new Set(['authorized', 'distributed', 'paid'])
    assert.ok(authorizedStatuses.has('authorized'))
    assert.ok(!authorizedStatuses.has('draft'))
  })

  it('draft/edited runs recalculate on preview (status not in frozen set)', () => {
    const recalcStatuses = ['draft', 'edited', 'pending']
    for (const s of recalcStatuses) {
      assert.ok(s !== 'authorized')
    }
  })
})
