import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  shouldPreservePayrollLineOnPreview,
  stripManualPayrollLineMetadata,
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

  it('still preserves edited line when pay_type matches', () => {
    assert.equal(
      shouldPreservePayrollLineOnPreview(
        {
          id: 'line-1',
          edited: true,
          metadata: { pay_type: 'fixed' },
        },
        { currentEffectivePayType: 'fixed' }
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
})
