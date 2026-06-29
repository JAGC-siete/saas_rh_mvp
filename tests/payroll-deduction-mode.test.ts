import { describe, expect, it } from 'vitest'
import {
  PAYROLL_DEDUCTION_MODE_DEFAULT,
  resolvePayrollDeductionMode,
  validatePayrollDeductionModeForFrequency,
} from '../lib/payroll/deduction-mode'

describe('resolvePayrollDeductionMode', () => {
  it('defaults to CON when metadata is empty', () => {
    expect(resolvePayrollDeductionMode({}, 'biweekly')).toBe('CON')
    expect(resolvePayrollDeductionMode(null, 'quincenal')).toBe(PAYROLL_DEDUCTION_MODE_DEFAULT)
  })

  it('returns configured mode for biweekly', () => {
    expect(
      resolvePayrollDeductionMode({ payroll_deduction_mode: '2PAGOS' }, 'quincenal')
    ).toBe('2PAGOS')
    expect(
      resolvePayrollDeductionMode({ payroll_deduction_mode: 'SIN' }, 'biweekly')
    ).toBe('SIN')
  })

  it('coerces 2PAGOS to CON when frequency is not biweekly', () => {
    expect(
      resolvePayrollDeductionMode({ payroll_deduction_mode: '2PAGOS' }, 'monthly')
    ).toBe('CON')
    expect(
      resolvePayrollDeductionMode({ payroll_deduction_mode: '2PAGOS' }, 'weekly')
    ).toBe('CON')
  })
})

describe('validatePayrollDeductionModeForFrequency', () => {
  it('rejects invalid modes', () => {
    const result = validatePayrollDeductionModeForFrequency('FOO', 'biweekly')
    expect(result.ok).toBe(false)
  })

  it('rejects 2PAGOS on monthly payroll', () => {
    const result = validatePayrollDeductionModeForFrequency('2PAGOS', 'monthly')
    expect(result.ok).toBe(false)
  })

  it('accepts valid modes', () => {
    expect(validatePayrollDeductionModeForFrequency('2PAGOS', 'biweekly')).toEqual({
      ok: true,
      mode: '2PAGOS',
    })
  })
})
