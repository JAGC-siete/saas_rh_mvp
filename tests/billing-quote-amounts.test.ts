import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { computeFrozenQuoteAmounts } from '../lib/billing/quote-amounts'

describe('computeFrozenQuoteAmounts', () => {
  it('freezes 50% deposit on monthly quote with 72h software discount', () => {
    const sentAt = new Date('2026-05-22T12:00:00.000Z')
    const result = computeFrozenQuoteAmounts({
      billingModality: 'monthly',
      monthlySoftwareTotal: 6375,
      monthlyHardwareFee: 1821.66,
      annualTotal: 76500,
      sentAt,
    })

    assert.equal(result.expectedTotalHnl, 6921.66)
    assert.equal(result.expectedDepositHnl, 3460.83)
  })

  it('freezes annual total with urgency discount on software only', () => {
    const sentAt = new Date('2026-05-22T12:00:00.000Z')
    const result = computeFrozenQuoteAmounts({
      billingModality: 'annual',
      monthlySoftwareTotal: 6375,
      monthlyHardwareFee: 0,
      annualTotal: 42075,
      sentAt,
    })

    assert.equal(result.expectedTotalHnl, 33660)
    assert.equal(result.expectedDepositHnl, 16830)
  })
})
