import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { collectAhcRefreshIds } from '../lib/payroll/ensure-period-ahc'
import {
  foldCustomsIntoFixedRecalcAmounts,
  metadataWithoutPlanKeys,
} from '../lib/payroll/apply-customs-after-fixed-recalc'
import { STANDARD_PAYROLL_ADJUSTMENT_FIELDS } from '../lib/payroll/standard-adjustment-fields'

describe('collectAhcRefreshIds', () => {
  it('flags missing and stale AHC rows', () => {
    const { missingIds, staleIds, refreshIds } = collectAhcRefreshIds(
      [
        { id: 'a', updated_at: '2026-07-20T12:00:00.000Z' },
        { id: 'b', updated_at: '2026-07-21T12:00:00.000Z' },
        { id: 'c', updated_at: '2026-07-19T12:00:00.000Z' },
      ],
      [
        { attendance_record_id: 'a', updated_at: '2026-07-20T11:00:00.000Z' }, // stale
        { attendance_record_id: 'c', updated_at: '2026-07-19T13:00:00.000Z' }, // fresh
      ]
    )
    assert.deepEqual(missingIds, ['b'])
    assert.deepEqual(staleIds, ['a'])
    assert.deepEqual(refreshIds.sort(), ['a', 'b'])
  })

  it('returns empty when all AHC are fresh', () => {
    const { refreshIds } = collectAhcRefreshIds(
      [{ id: 'a', updated_at: '2026-07-20T10:00:00.000Z' }],
      [{ attendance_record_id: 'a', updated_at: '2026-07-20T12:00:00.000Z' }]
    )
    assert.deepEqual(refreshIds, [])
  })
})

describe('foldCustomsIntoFixedRecalcAmounts', () => {
  it('adds custom earnings on top of day+OT gross and net', () => {
    const r = foldCustomsIntoFixedRecalcAmounts({
      dayOtGross: 5000,
      netAfterStatutoryAndPlans: 4500,
      ingresosAdicionales: 200,
      customDeductionsExcludingPlans: 50,
    })
    assert.equal(r.bruto, 5200)
    assert.equal(r.neto, 4650)
  })

  it('is a no-op when customs are zero', () => {
    const r = foldCustomsIntoFixedRecalcAmounts({
      dayOtGross: 5000,
      netAfterStatutoryAndPlans: 4500,
      ingresosAdicionales: 0,
      customDeductionsExcludingPlans: 0,
    })
    assert.equal(r.bruto, 5000)
    assert.equal(r.neto, 4500)
  })
})

describe('metadataWithoutPlanKeys', () => {
  it('strips plan keys and keeps other customs', () => {
    const out = metadataWithoutPlanKeys(
      {
        bono: 100,
        prestamo: 50,
        tax_year: 2026,
        _deduction_plan_ids: ['x'],
      },
      new Set(['prestamo'])
    )
    assert.equal(out.bono, 100)
    assert.equal(out.prestamo, undefined)
    assert.equal(out._deduction_plan_ids, undefined)
    assert.equal(out.tax_year, 2026)
  })
})

describe('STANDARD_PAYROLL_ADJUSTMENT_FIELDS', () => {
  it('covers trigger-driven fields', () => {
    assert.deepEqual([...STANDARD_PAYROLL_ADJUSTMENT_FIELDS], [
      'hours',
      'bruto',
      'ihss',
      'rap',
      'isr',
      'neto',
    ])
  })
})
