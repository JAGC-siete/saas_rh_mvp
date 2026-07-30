/**
 * Statutory override helpers + preserve integration.
 * Run: npx tsx --test tests/statutory-zero-override.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  applyStatutoryOverrideToEffectiveAmounts,
  applyStatutoryZeroToEffectiveAmounts,
  hasStatutoryZeroOverride,
  isStatutoryFullyZeroed,
  stampStatutoryOverrideMetadata,
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

describe('applyStatutoryOverrideToEffectiveAmounts', () => {
  it('edits only IHSS; RAP/ISR intact; neto += oldIhss − newIhss', () => {
    const out = applyStatutoryOverrideToEffectiveAmounts({
      eff_bruto: 1000,
      eff_ihss: 100,
      eff_rap: 20,
      eff_isr: 30,
      eff_neto: 850,
      next: { ihss: 50 },
    })
    assert.equal(out.eff_ihss, 50)
    assert.equal(out.eff_rap, 20)
    assert.equal(out.eff_isr, 30)
    assert.equal(out.eff_neto, 900)
    assert.equal(out.statutory_delta, 50)
    assert.deepEqual(out.applied, { ihss: true, rap: false, isr: false })
  })

  it('partial override keeps custom deductions in neto gap', () => {
    // bruto 1000, ihss 100, rap 0, isr 0, custom 50 → neto 850
    // set ihss=40 → neto should be 850 + 60 = 910 (custom 50 preserved)
    const out = applyStatutoryOverrideToEffectiveAmounts({
      eff_bruto: 1000,
      eff_ihss: 100,
      eff_rap: 0,
      eff_isr: 0,
      eff_neto: 850,
      next: { ihss: 40 },
    })
    assert.equal(out.eff_ihss, 40)
    assert.equal(out.eff_neto, 910)
    const impliedCustom = 1000 - 40 - 0 - 0 - out.eff_neto
    assert.equal(impliedCustom, 50)
  })

  it('zero-all via next {0,0,0} matches applyStatutoryZero', () => {
    const base = {
      eff_bruto: 2000,
      eff_ihss: 80,
      eff_rap: 10,
      eff_isr: 5,
      eff_neto: 1700,
    }
    const zero = applyStatutoryZeroToEffectiveAmounts(base)
    const override = applyStatutoryOverrideToEffectiveAmounts({
      ...base,
      next: { ihss: 0, rap: 0, isr: 0 },
    })
    assert.equal(override.eff_ihss, zero.eff_ihss)
    assert.equal(override.eff_rap, zero.eff_rap)
    assert.equal(override.eff_isr, zero.eff_isr)
    assert.equal(override.eff_neto, zero.eff_neto)
    assert.equal(override.statutory_delta, zero.statutory_removed)
  })
})

describe('statutory override metadata', () => {
  it('stamps and detects override (zero-all)', () => {
    const meta = stampStatutoryZeroMetadata({}, { userId: 'u1', reason: 'Finiquito' })
    assert.equal(hasStatutoryZeroOverride(meta), true)
    assert.equal(meta.statutory_zeroed_by, 'u1')
    assert.equal(meta.statutory_zeroed_reason, 'Finiquito')
    assert.equal(meta.statutory_override_ihss, 0)
    assert.equal(meta.statutory_override_rap, 0)
    assert.equal(meta.statutory_override_isr, 0)
  })

  it('stamps only applied concepts with amounts', () => {
    const meta = stampStatutoryOverrideMetadata({}, {
      userId: 'u2',
      reason: 'Ajuste IHSS',
      applied: { ihss: true, rap: false, isr: false },
      amounts: { ihss: 50, rap: 20, isr: 30 },
    })
    assert.equal(meta.statutory_zero_ihss, true)
    assert.equal(meta.statutory_override_ihss, 50)
    assert.equal(meta.statutory_zero_rap, undefined)
    assert.equal(meta.statutory_override_rap, undefined)
    assert.equal(hasStatutoryZeroOverride(meta), true)
  })

  it('strip removes keys including override amounts; preserve sees statutory_zeroed_at', () => {
    const meta = stampStatutoryOverrideMetadata(
      { tax_year: 2026 },
      {
        userId: 'u1',
        reason: 'test reason',
        applied: { ihss: true, rap: true, isr: false },
        amounts: { ihss: 50, rap: 0, isr: 10 },
      }
    )
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
    assert.equal(cleaned.statutory_override_ihss, undefined)
    assert.equal(cleaned.statutory_override_rap, undefined)
    assert.equal(hasStatutoryZeroOverride(stripStatutoryZeroMetadata(meta)), false)
  })

  it('isStatutoryFullyZeroed distinguishes omit vs partial', () => {
    assert.equal(isStatutoryFullyZeroed({ ihss: 0, rap: 0, isr: 0 }), true)
    assert.equal(isStatutoryFullyZeroed({ ihss: 50, rap: 0, isr: 0 }), false)
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
