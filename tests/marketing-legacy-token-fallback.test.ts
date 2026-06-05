import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  isWithinLegacyTokenWindow,
  LEGACY_PENDING_MAX_AGE_DAYS,
} from '../lib/marketing/legacy-token-fallback'

describe('legacy token fallback (P4)', () => {
  it('uses same 30-day window as P2 migration', () => {
    assert.equal(LEGACY_PENDING_MAX_AGE_DAYS, 30)
  })

  it('isWithinLegacyTokenWindow true at day 30 boundary', () => {
    const now = new Date('2026-06-05T12:00:00Z')
    const created = new Date('2026-05-06T12:00:00Z')
    assert.equal(isWithinLegacyTokenWindow(created, now), true)
  })

  it('isWithinLegacyTokenWindow false after 30 days', () => {
    const now = new Date('2026-06-05T12:00:00Z')
    const created = new Date('2026-05-05T11:59:59Z')
    assert.equal(isWithinLegacyTokenWindow(created, now), false)
  })
})
