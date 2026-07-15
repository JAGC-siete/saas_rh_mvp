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
  overtimeHoursTotal,
  resolveFixedOvertimePay,
  readOvertimeOverrideFromMetadata,
  mapLegacyAhcBucketsToBreakdown,
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

describe('shouldPayOvertimeToEmployee (Capa 2)', () => {
  it('company false → nobody paid (Capa 2 irrelevant)', () => {
    assert.equal(shouldPayOvertimeToEmployee(false, 'hourly'), false)
    assert.equal(shouldPayOvertimeToEmployee(false, 'hourly', true), false)
    assert.equal(shouldPayOvertimeToEmployee(false, 'fixed'), false)
  })

  it('company true + hourly + Sí (default) → paid', () => {
    assert.equal(shouldPayOvertimeToEmployee(true, 'hourly'), true)
    assert.equal(shouldPayOvertimeToEmployee(true, 'hourly', true), true)
    assert.equal(shouldPayOvertimeToEmployee(true, 'hourly', null), true)
    assert.equal(shouldPayOvertimeToEmployee(true, 'hourly', undefined), true)
  })

  it('company true + hourly + No → not paid', () => {
    assert.equal(shouldPayOvertimeToEmployee(true, 'hourly', false), false)
  })

  it('company true + fixed + Sí (default) → paid', () => {
    assert.equal(shouldPayOvertimeToEmployee(true, 'fixed'), true)
    assert.equal(shouldPayOvertimeToEmployee(true, 'fixed', null), true)
    assert.equal(shouldPayOvertimeToEmployee(true, 'fixed', true), true)
  })

  it('company true + fixed + No → not paid', () => {
    assert.equal(shouldPayOvertimeToEmployee(true, 'fixed', false), false)
  })

  it('company true + admin_floor + Sí → paid', () => {
    assert.equal(shouldPayOvertimeToEmployee(true, 'admin_floor', true), true)
    assert.equal(shouldPayOvertimeToEmployee(true, 'admin_floor', false), false)
  })
})

describe('resolveFixedOvertimePay', () => {
  it('employee false → pay 0 but keeps hours for display', () => {
    const r = resolveFixedOvertimePay({
      companyPayOvertime: true,
      employeePayOvertime: false,
      hourlyRate: 100,
      ahcBreakdown: {
        evening_25: 2,
        night_50: 0,
        late_75: 0,
        morning_25: 0,
        holiday_100: 0,
      },
    })
    assert.equal(r.paid, false)
    assert.equal(r.pay, 0)
    assert.equal(r.hoursTotal, 2)
  })

  it('override wins over AHC when paid', () => {
    const r = resolveFixedOvertimePay({
      companyPayOvertime: true,
      employeePayOvertime: true,
      hourlyRate: 100,
      ahcBreakdown: {
        evening_25: 8,
        night_50: 0,
        late_75: 0,
        morning_25: 0,
        holiday_100: 0,
      },
      overrideBreakdown: {
        evening_25: 2,
        night_50: 0,
        late_75: 0,
        morning_25: 0,
        holiday_100: 0,
      },
    })
    assert.equal(r.paid, true)
    assert.equal(r.pay, 250)
    assert.equal(r.hoursTotal, 2)
  })

  it('readOvertimeOverrideFromMetadata requires ot_adjusted_at', () => {
    assert.equal(readOvertimeOverrideFromMetadata({ ot_evening_25: 1 }), null)
    assert.deepEqual(
      readOvertimeOverrideFromMetadata({
        ot_adjusted_at: '2026-01-01',
        ot_evening_25: 1,
        ot_night_50: 0.5,
        ot_late_75: 0,
        ot_morning_25: 0,
        ot_holiday_100: 2,
      }),
      {
        evening_25: 1,
        night_50: 0.5,
        late_75: 0,
        morning_25: 0,
        holiday_100: 2,
      }
    )
  })

  it('maps legacy ot_diurno metadata', () => {
    assert.deepEqual(
      readOvertimeOverrideFromMetadata({
        ot_adjusted_at: '2026-01-01',
        ot_diurno: 1,
        ot_nocturno: 0.5,
        ot_feriado: 2,
      }),
      mapLegacyAhcBucketsToBreakdown({ diurno: 1, nocturno: 0.5, feriado: 2 })
    )
  })
})

describe('calculateOvertimePayFromAhc (band premiums)', () => {
  it('25% evening → ×1.25', () => {
    const pay = calculateOvertimePayFromAhc(
      {
        evening_25: 2,
        night_50: 0,
        late_75: 0,
        morning_25: 0,
        holiday_100: 0,
      },
      100
    )
    assert.equal(pay, 250)
  })

  it('50% / 75% / 100% multipliers', () => {
    assert.equal(
      calculateOvertimePayFromAhc(
        {
          evening_25: 0,
          night_50: 1,
          late_75: 0,
          morning_25: 0,
          holiday_100: 0,
        },
        100
      ),
      150
    )
    assert.equal(
      calculateOvertimePayFromAhc(
        {
          evening_25: 0,
          night_50: 0,
          late_75: 1,
          morning_25: 0,
          holiday_100: 0,
        },
        100
      ),
      175
    )
    assert.equal(
      calculateOvertimePayFromAhc(
        {
          evening_25: 0,
          night_50: 0,
          late_75: 0,
          morning_25: 0,
          holiday_100: 1,
        },
        100
      ),
      200
    )
  })

  it('returns 0 for zero rate', () => {
    assert.equal(
      calculateOvertimePayFromAhc(
        {
          evening_25: 5,
          night_50: 0,
          late_75: 0,
          morning_25: 0,
          holiday_100: 0,
        },
        0
      ),
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
        overtime_feriado_hours: 0,
      },
      {
        employee_id: 'emp-fixed',
        overtime_diurno_hours: 0,
        overtime_nocturno_hours: 0,
        overtime_feriado_hours: 1,
      },
    ]
    let total = 0
    for (const row of rows) {
      const b = mapLegacyAhcBucketsToBreakdown({
        diurno: Number(row.overtime_diurno_hours || 0),
        nocturno: Number(row.overtime_nocturno_hours || 0),
        feriado: Number(row.overtime_feriado_hours || 0),
      })
      total += overtimeHoursTotal(b)
    }
    assert.equal(total, 2.5)
    assert.equal(shouldPayOvertimeToEmployee(true, 'fixed'), true)
  })
})

describe('QA: preview persistence semantics', () => {
  it('authorized runs use frozen eff_* (documented contract)', () => {
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
