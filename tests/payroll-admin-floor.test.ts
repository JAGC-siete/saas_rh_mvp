/**
 * Admin con piso horario + resolución de pay_type.
 * Run: npx tsx --test tests/payroll-admin-floor.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  resolveEffectivePayType,
  parseCompanyCalculationMode,
  isHourBasedPayType,
} from '../lib/payroll/resolve-effective-pay-type'
import {
  computeAdminFloorDayHours,
  sumAdminFloorPeriodHours,
  resolveOrdinaryHoursCap,
} from '../lib/payroll/admin-floor-hours'
import { shouldPayOvertimeToEmployee } from '../lib/payroll/overtime-pay'

describe('resolveEffectivePayType admin_floor', () => {
  it('inherits admin_floor from company when employee null', () => {
    assert.equal(resolveEffectivePayType(null, 'admin_floor'), 'admin_floor')
    assert.equal(parseCompanyCalculationMode('admin_floor'), 'admin_floor')
  })

  it('employee override wins', () => {
    assert.equal(resolveEffectivePayType('fixed', 'admin_floor'), 'fixed')
    assert.equal(resolveEffectivePayType('admin_floor', 'hourly'), 'admin_floor')
    assert.equal(resolveEffectivePayType('hourly', 'admin_floor'), 'hourly')
  })

  it('isHourBasedPayType', () => {
    assert.equal(isHourBasedPayType('hourly'), true)
    assert.equal(isHourBasedPayType('admin_floor'), true)
    assert.equal(isHourBasedPayType('fixed'), false)
  })
})

describe('computeAdminFloorDayHours', () => {
  const cap = 8

  it('no check-in → 0', () => {
    assert.deepEqual(computeAdminFloorDayHours({}, cap), {
      ordinary: 0,
      overtime: 0,
      payable: 0,
    })
  })

  it('check-in sin salida → piso = tope', () => {
    assert.deepEqual(
      computeAdminFloorDayHours({ check_in: '08:00', check_out: null, total_hours: 3 }, cap),
      { ordinary: 8, overtime: 0, payable: 8 }
    )
  })

  it('ambas marcas bajo tope → piso', () => {
    assert.deepEqual(
      computeAdminFloorDayHours({ check_in: 'a', check_out: 'b', total_hours: 5 }, cap),
      { ordinary: 8, overtime: 0, payable: 8 }
    )
  })

  it('ambas marcas sobre tope → HE = exceso', () => {
    assert.deepEqual(
      computeAdminFloorDayHours({ check_in: 'a', check_out: 'b', total_hours: 10 }, cap),
      { ordinary: 8, overtime: 2, payable: 10 }
    )
  })
})

describe('sumAdminFloorPeriodHours', () => {
  it('aggregates days', () => {
    const sum = sumAdminFloorPeriodHours(
      [
        { check_in: '1', check_out: null, total_hours: 0 },
        { check_in: '1', check_out: '2', total_hours: 10 },
      ],
      8
    )
    assert.equal(sum.ordinary, 16)
    assert.equal(sum.overtime, 2)
    assert.equal(sum.payable, 18)
  })
})

describe('resolveOrdinaryHoursCap', () => {
  it('uses override, else legal, else 8', () => {
    assert.equal(resolveOrdinaryHoursCap(7.5, 8), 7.5)
    assert.equal(resolveOrdinaryHoursCap(null, 9), 9)
    assert.equal(resolveOrdinaryHoursCap(null, null), 8)
  })
})

describe('shouldPayOvertimeToEmployee admin_floor', () => {
  it('pays OT when company+employee ON', () => {
    assert.equal(shouldPayOvertimeToEmployee(true, 'admin_floor', true), true)
    assert.equal(shouldPayOvertimeToEmployee(true, 'admin_floor', false), false)
    assert.equal(shouldPayOvertimeToEmployee(false, 'admin_floor', true), false)
  })
})
