import { describe, expect, it } from 'vitest'
import {
  shouldPreservePayrollLineOnPreview,
  stripManualPayrollLineMetadata,
} from '../lib/payroll/preview-preserve-line'

describe('preview-preserve-line', () => {
  it('preserves when edited is true', () => {
    expect(
      shouldPreservePayrollLineOnPreview({
        id: 'line-1',
        edited: true,
        metadata: {},
      })
    ).toBe(true)
  })

  it('preserves when days were manually adjusted', () => {
    expect(
      shouldPreservePayrollLineOnPreview({
        id: 'line-1',
        edited: false,
        metadata: { days_adjusted_at: '2026-01-01T00:00:00.000Z' },
      })
    ).toBe(true)
  })

  it('does not preserve fresh calculated lines', () => {
    expect(
      shouldPreservePayrollLineOnPreview({
        id: 'line-1',
        edited: false,
        metadata: { tax_year: 2026 },
      })
    ).toBe(false)
  })

  it('preserves when statutory deductions were zeroed', () => {
    expect(
      shouldPreservePayrollLineOnPreview({
        id: 'line-1',
        edited: false,
        metadata: { statutory_zeroed_at: '2026-07-14T00:00:00.000Z' },
      })
    ).toBe(true)
  })

  it('strips manual adjustment metadata keys', () => {
    expect(
      stripManualPayrollLineMetadata({
        tax_year: 2026,
        days_adjusted_at: '2026-01-01',
        days_adjusted_by: 'user-1',
        days_adjusted_reason: 'ajuste',
        statutory_zeroed_at: '2026-07-14',
        statutory_zeroed_reason: 'finiquito',
        bono: 100,
      })
    ).toEqual({
      tax_year: 2026,
      bono: 100,
    })
  })
})
