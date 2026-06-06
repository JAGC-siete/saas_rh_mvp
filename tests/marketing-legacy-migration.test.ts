import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  LEGACY_PENDING_MAX_AGE_DAYS,
  mapLegacyMailListRow,
} from '../lib/marketing/legacy-migration'

describe('P2 legacy mail list migration mapping', () => {
  const now = new Date('2026-06-05T12:00:00Z')

  it('confirmed → active step 1 with ledger marker', () => {
    const r = mapLegacyMailListRow({
      status: 'confirmed',
      createdAt: new Date('2025-01-01'),
      now,
    })
    assert.equal(r.status, 'active')
    assert.equal(r.currentStep, 1)
    assert.equal(r.recordLedgerMarker, true)
  })

  it('pending within 30 days → active step 1', () => {
    const r = mapLegacyMailListRow({
      status: 'pending',
      createdAt: new Date('2026-05-20T12:00:00Z'),
      now,
    })
    assert.equal(r.status, 'active')
    assert.equal(r.currentStep, 1)
    assert.equal(r.recordLedgerMarker, true)
  })

  it('pending older than 30 days → unsubscribed stale (no ledger)', () => {
    const r = mapLegacyMailListRow({
      status: 'pending',
      createdAt: new Date('2026-04-01T12:00:00Z'),
      now,
    })
    assert.equal(r.status, 'unsubscribed')
    assert.equal(r.currentStep, 5)
    assert.equal(r.recordLedgerMarker, false)
    assert.equal(r.p2TargetStatus, 'unsubscribed_stale')
  })

  it('unsubscribed legacy → unsubscribed marketing', () => {
    const r = mapLegacyMailListRow({
      status: 'unsubscribed',
      createdAt: new Date('2024-06-01'),
      now,
    })
    assert.equal(r.status, 'unsubscribed')
    assert.equal(r.p2TargetStatus, 'unsubscribed')
  })

  it('uses 30 day cutoff constant', () => {
    assert.equal(LEGACY_PENDING_MAX_AGE_DAYS, 30)
  })
})
