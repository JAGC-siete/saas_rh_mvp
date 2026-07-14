/**
 * Statutory zero override helpers + preserve integration.
 * Run: npx tsx --test tests/statutory-zero-override.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  applyStatutoryZeroToEffectiveAmounts,
  hasStatutoryZeroOverride,
  stampStatutoryZeroMetadata,
  stripStatutoryZeroMetadata,
} from '../lib/payroll/statutory-zero-override'
import {
  shouldPreservePayrollLineOnPreview,
  stripManualPayrollLineMetadata,
} from '../lib/payroll/preview-preserve-line'
import { mapPlanillaItemToUnifiedRow } from '../lib/payroll-unified'

describe('applyStatutoryZeroToEffectiveAmounts', () => {
  it('zeros IHSS/RAP/ISR and adds them back into neto', () => {
    const out = applyStatutoryZeroToEffectiveAmounts({
      eff_bruto: 7500,
      eff_ihss: 297.58,
      eff_rap: 23.23,
      eff_isr: 0,
      eff_neto: 5801.69,
    })
    assert.equal(out.eff_ihss, 0)
    assert.equal(out.eff_rap, 0)
    assert.equal(out.eff_isr, 0)
    assert.equal(out.eff_neto, 6122.5)
    assert.equal(out.statutory_removed, 320.81)
  })

  it('keeps custom deductions embedded in neto gap', () => {
    // bruto 1000, ihss 100, custom 50 → neto 850
    const out = applyStatutoryZeroToEffectiveAmounts({
      eff_bruto: 1000,
      eff_ihss: 100,
      eff_rap: 0,
      eff_isr: 0,
      eff_neto: 850,
    })
    assert.equal(out.eff_neto, 950)
  })
})

describe('statutory zero metadata', () => {
  it('stamps and detects override', () => {
    const meta = stampStatutoryZeroMetadata({}, { userId: 'u1', reason: 'Finiquito' })
    assert.equal(hasStatutoryZeroOverride(meta), true)
    assert.equal(meta.statutory_zeroed_by, 'u1')
    assert.equal(meta.statutory_zeroed_reason, 'Finiquito')
  })

  it('strip removes keys; preserve sees statutory_zeroed_at', () => {
    const meta = stampStatutoryZeroMetadata({ tax_year: 2026 }, { userId: 'u1', reason: 'test reason' })
    assert.equal(
      shouldPreservePayrollLineOnPreview({
        id: 'l1',
        edited: false,
        metadata: meta,
      }),
      true
    )
    const cleaned = stripManualPayrollLineMetadata(meta)
    assert.equal(cleaned.tax_year, 2026)
    assert.equal(cleaned.statutory_zeroed_at, undefined)
    assert.equal(hasStatutoryZeroOverride(stripStatutoryZeroMetadata(meta)), false)
  })
})

describe('UnifiedRow reflects zeroed statutory', () => {
  it('maps zero IHSS/RAP into extras row for display', () => {
    const row = mapPlanillaItemToUnifiedRow({
      employee_id: 'e1',
      name: 'A',
      base_salary: 15000,
      total_earnings: 6122.5,
      IHSS: 0,
      RAP: 0,
      ISR: 0,
      total_deducciones: 0,
      total: 6122.5,
      days_worked: 11,
      days_absent: 0,
      late_days: 0,
      pay_type: 'fixed',
      metadata: { statutory_zeroed_at: '2026-07-14T00:00:00.000Z' },
    } as any)
    assert.equal(row.IHSS, 0)
    assert.equal(row.RAP, 0)
    assert.ok((row as any).metadata?.statutory_zeroed_at)
  })
})
