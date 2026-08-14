import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  shouldPreservePayrollLineOnPreview,
  stripManualPayrollLineMetadata,
  buildFixedPlanillaRowFromPersistedLine,
} from '../lib/payroll/preview-preserve-line'

describe('preview-preserve-line', () => {
  it('preserves when edited is true', () => {
    assert.equal(
      shouldPreservePayrollLineOnPreview({
        id: 'line-1',
        edited: true,
        metadata: {},
      }),
      true
    )
  })

  it('preserves when days were manually adjusted', () => {
    assert.equal(
      shouldPreservePayrollLineOnPreview({
        id: 'line-1',
        edited: false,
        metadata: { days_adjusted_at: '2026-01-01T00:00:00.000Z' },
      }),
      true
    )
  })

  it('preserves when OT was manually adjusted', () => {
    assert.equal(
      shouldPreservePayrollLineOnPreview({
        id: 'line-1',
        edited: false,
        metadata: { ot_adjusted_at: '2026-01-01T00:00:00.000Z' },
      }),
      true
    )
  })

  it('does not preserve when pay_type drifted even if edited', () => {
    assert.equal(
      shouldPreservePayrollLineOnPreview(
        {
          id: 'line-1',
          edited: true,
          metadata: { pay_type: 'hourly' },
        },
        { currentEffectivePayType: 'fixed' }
      ),
      false
    )
  })

  it('does not preserve when base_salary drifted even if edited', () => {
    assert.equal(
      shouldPreservePayrollLineOnPreview(
        {
          id: 'line-1',
          edited: true,
          metadata: {
            pay_type: 'fixed',
            base_salary_used: 15500,
            days_adjusted_at: '2026-08-01T00:00:00.000Z',
            ot_adjusted_at: '2026-08-01T00:00:00.000Z',
          },
        },
        { currentEffectivePayType: 'fixed', currentBaseSalary: 16500 }
      ),
      false
    )
  })

  it('still preserves edited line when salary matches stamp', () => {
    assert.equal(
      shouldPreservePayrollLineOnPreview(
        {
          id: 'line-1',
          edited: true,
          metadata: { pay_type: 'fixed', base_salary_used: 16500 },
        },
        { currentEffectivePayType: 'fixed', currentBaseSalary: 16500 }
      ),
      true
    )
  })

  it('preserves edited line when salary stamp is missing', () => {
    assert.equal(
      shouldPreservePayrollLineOnPreview(
        {
          id: 'line-1',
          edited: true,
          metadata: { pay_type: 'fixed' },
        },
        { currentEffectivePayType: 'fixed', currentBaseSalary: 16500 }
      ),
      true
    )
  })

  it('does not preserve fresh calculated lines', () => {
    assert.equal(
      shouldPreservePayrollLineOnPreview({
        id: 'line-1',
        edited: false,
        metadata: { tax_year: 2026 },
      }),
      false
    )
  })

  it('preserves when statutory deductions were zeroed', () => {
    assert.equal(
      shouldPreservePayrollLineOnPreview({
        id: 'line-1',
        edited: false,
        metadata: { statutory_zeroed_at: '2026-07-14T00:00:00.000Z' },
      }),
      true
    )
  })

  it('strips manual adjustment metadata keys including OT override', () => {
    assert.deepEqual(
      stripManualPayrollLineMetadata({
        tax_year: 2026,
        days_adjusted_at: '2026-01-01',
        days_adjusted_by: 'user-1',
        days_adjusted_reason: 'ajuste',
        ot_adjusted_at: '2026-01-02',
        ot_evening_25: 2,
        ot_night_50: 0,
        ot_late_75: 0,
        ot_morning_25: 0,
        ot_holiday_100: 0,
        statutory_zeroed_at: '2026-07-14',
        statutory_zeroed_reason: 'finiquito',
        bono: 100,
      }),
      {
        tax_year: 2026,
        bono: 100,
      }
    )
  })

  it('preserved row displays stamped salary not live employee salary', () => {
    const row = buildFixedPlanillaRowFromPersistedLine({
      emp: {
        id: 'emp-1',
        name: 'Test',
        base_salary: 16500,
      },
      departmentName: 'Ops',
      prevLine: {
        id: 'line-1',
        edited: true,
        eff_hours: 15,
        eff_bruto: 7750,
        eff_ihss: 0,
        eff_rap: 0,
        eff_isr: 0,
        eff_neto: 7750,
        metadata: { base_salary_used: 15500, overtime_pay: 100 },
      },
      horasExtras: 0,
      diasPeriodo: 15,
    })
    assert.equal(row.base_salary, 15500)
    assert.equal(row.monthly_salary, 15500)
    assert.equal(row.total_earnings, 7750)
  })
})
