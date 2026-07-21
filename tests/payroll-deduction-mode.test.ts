import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  PAYROLL_DEDUCTION_MODE_DEFAULT,
  resolvePayrollDeductionMode,
  validatePayrollDeductionModeForFrequency,
} from '../lib/payroll/deduction-mode'

describe('resolvePayrollDeductionMode', () => {
  it('defaults to CON when metadata is empty', () => {
    assert.equal(resolvePayrollDeductionMode({}, 'biweekly'), 'CON')
    assert.equal(resolvePayrollDeductionMode(null, 'quincenal'), PAYROLL_DEDUCTION_MODE_DEFAULT)
  })

  it('returns configured mode for biweekly', () => {
    assert.equal(
      resolvePayrollDeductionMode({ payroll_deduction_mode: '2PAGOS' }, 'quincenal'),
      '2PAGOS'
    )
    assert.equal(
      resolvePayrollDeductionMode({ payroll_deduction_mode: 'SIN' }, 'biweekly'),
      'SIN'
    )
  })

  it('coerces 2PAGOS to CON when frequency is not biweekly', () => {
    assert.equal(
      resolvePayrollDeductionMode({ payroll_deduction_mode: '2PAGOS' }, 'monthly'),
      'CON'
    )
    assert.equal(
      resolvePayrollDeductionMode({ payroll_deduction_mode: '2PAGOS' }, 'weekly'),
      'CON'
    )
  })
})

describe('validatePayrollDeductionModeForFrequency', () => {
  it('rejects invalid modes', () => {
    const result = validatePayrollDeductionModeForFrequency('FOO', 'biweekly')
    assert.equal(result.ok, false)
  })

  it('rejects 2PAGOS on monthly payroll', () => {
    const result = validatePayrollDeductionModeForFrequency('2PAGOS', 'monthly')
    assert.equal(result.ok, false)
  })

  it('accepts valid modes', () => {
    assert.deepEqual(validatePayrollDeductionModeForFrequency('2PAGOS', 'biweekly'), {
      ok: true,
      mode: '2PAGOS',
    })
  })
})
