import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parsePaymentKind } from '../lib/billing/activate-from-quote'

describe('parsePaymentKind', () => {
  it('defaults to deposit when the form sends nothing', () => {
    assert.equal(parsePaymentKind(undefined), 'deposit')
    assert.equal(parsePaymentKind(''), 'deposit')
  })

  it('accepts the kinds the database allows, renewal included', () => {
    for (const kind of ['deposit', 'subscription', 'adjustment', 'renewal']) {
      assert.equal(parsePaymentKind(kind), kind)
    }
  })

  it('rejects anything else', () => {
    assert.equal(parsePaymentKind('refund'), null)
    assert.equal(parsePaymentKind(1), null)
  })
})
