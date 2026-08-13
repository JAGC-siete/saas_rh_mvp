import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  appendUnsubscribeFooter,
  buildUnsubscribeUrl,
  generateUnsubscribeToken,
} from '../lib/marketing/unsubscribe'
import {
  getWatchWindow,
  getWatchWindowKey,
  isBiMonthlyWatchDay,
} from '../lib/marketing/email-sequence-ledger'

describe('marketing unsubscribe (P1)', () => {
  it('generateUnsubscribeToken returns 48 hex chars', () => {
    const token = generateUnsubscribeToken()
    assert.match(token, /^[0-9a-f]{48}$/)
  })

  it('buildUnsubscribeUrl encodes token in mail-list unsubscribe route', () => {
    const url = buildUnsubscribeUrl('abc123')
    assert.ok(url.includes('/api/mail-list/unsubscribe?token=abc123'))
  })

  it('appendUnsubscribeFooter adds baja link', () => {
    const body = appendUnsubscribeFooter('Hola mundo', 'tokentest')
    assert.ok(body.includes('Hola mundo'))
    assert.ok(body.includes('La serie contiene únicamente 5 correos'))
    assert.ok(body.includes('dejar de recibirlos aquí'))
    assert.ok(body.includes('tokentest'))
  })
})

describe('sequence watchman windows (P0)', () => {
  it('isBiMonthlyWatchDay true on days 12–16 and 26–30', () => {
    assert.equal(isBiMonthlyWatchDay(new Date(2026, 5, 12)), true)
    assert.equal(isBiMonthlyWatchDay(new Date(2026, 5, 16)), true)
    assert.equal(isBiMonthlyWatchDay(new Date(2026, 5, 26)), true)
    assert.equal(isBiMonthlyWatchDay(new Date(2026, 5, 30)), true)
    assert.equal(isBiMonthlyWatchDay(new Date(2026, 5, 11)), false)
    assert.equal(isBiMonthlyWatchDay(new Date(2026, 5, 20)), false)
  })

  it('getWatchWindowKey returns YYYY-M-first|second', () => {
    assert.equal(getWatchWindowKey(new Date(2026, 0, 14)), '2026-1-first')
    assert.equal(getWatchWindowKey(new Date(2026, 0, 28)), '2026-1-second')
    assert.equal(getWatchWindow(new Date(2026, 0, 10)), null)
  })
})
