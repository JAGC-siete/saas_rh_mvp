import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mapActivacionRow } from '../lib/marketing/activaciones-migration'

describe('activaciones → marketing_leads mapping', () => {
  const now = new Date('2026-06-05T12:00:00Z')

  it('trial_live → active step 1 with ledger', () => {
    const r = mapActivacionRow({ status: 'trial_live', createdAt: new Date('2025-01-01'), now })
    assert.equal(r.status, 'active')
    assert.equal(r.currentStep, 1)
    assert.equal(r.recordLedgerMarker, true)
  })

  it('trial_pending_data within 30 days → active', () => {
    const r = mapActivacionRow({
      status: 'trial_pending_data',
      createdAt: new Date('2026-05-10T12:00:00Z'),
      now,
    })
    assert.equal(r.status, 'active')
    assert.equal(r.recordLedgerMarker, true)
  })

  it('trial_pending_data older than 30 days → unsubscribed stale', () => {
    const r = mapActivacionRow({
      status: 'trial_pending_data',
      createdAt: new Date('2026-04-01T12:00:00Z'),
      now,
    })
    assert.equal(r.status, 'unsubscribed')
    assert.equal(r.currentStep, 5)
    assert.equal(r.recordLedgerMarker, false)
  })

  it('rejected → unsubscribed', () => {
    const r = mapActivacionRow({ status: 'rejected', createdAt: now, now })
    assert.equal(r.status, 'unsubscribed')
  })
})
