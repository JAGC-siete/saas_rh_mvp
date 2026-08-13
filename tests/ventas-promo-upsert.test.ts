import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { normalizePromoCodeInputs, planPromoCodeUpserts } from '../lib/ventas/promo-codes'

describe('planPromoCodeUpserts', () => {
  it('updates existing codes instead of insert (avoids unique conflict)', () => {
    const existing = [
      { id: 'a1', code: 'Gastro2026' },
      { id: 'b2', code: 'oldcode' },
    ]
    const desired = normalizePromoCodeInputs([
      { code: 'gastro2026', discount_pct: 0.4, label: 'main', sort_order: 10 },
      { code: 'newone', discount_pct: 0.1, sort_order: 20 },
    ])

    const plan = planPromoCodeUpserts(existing, desired)

    assert.equal(plan.updates.length, 1)
    assert.equal(plan.updates[0].id, 'a1')
    assert.equal(plan.updates[0].discount_pct, 0.4)
    assert.equal(plan.inserts.length, 1)
    assert.equal(plan.inserts[0].code, 'newone')
    assert.deepEqual(plan.deactivateIds, ['b2'])
  })

  it('re-saving same codes only updates (no inserts)', () => {
    const existing = [{ id: 'x', code: 'promo' }]
    const desired = normalizePromoCodeInputs([{ code: 'PROMO', discount_pct: 0.2 }])
    const plan = planPromoCodeUpserts(existing, desired)
    assert.equal(plan.inserts.length, 0)
    assert.equal(plan.updates.length, 1)
    assert.equal(plan.deactivateIds.length, 0)
  })
})
