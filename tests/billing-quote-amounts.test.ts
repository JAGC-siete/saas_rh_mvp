import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { computeFrozenQuoteAmounts } from '../lib/billing/quote-amounts'

describe('computeFrozenQuoteAmounts', () => {
  it('freezes 50% deposit on monthly quote at list price', () => {
    const result = computeFrozenQuoteAmounts({
      billingModality: 'monthly',
      monthlySoftwareTotal: 6375,
      monthlyHardwareFee: 1821.66,
      annualTotal: 76500,
    })

    assert.equal(result.expectedTotalHnl, 8196.66)
    assert.equal(result.expectedDepositHnl, 4098.33)
  })

  it('freezes annual total at quoted amount (no urgency discount)', () => {
    const result = computeFrozenQuoteAmounts({
      billingModality: 'annual',
      monthlySoftwareTotal: 6375,
      monthlyHardwareFee: 0,
      annualTotal: 42075,
    })

    assert.equal(result.expectedTotalHnl, 42075)
    assert.equal(result.expectedDepositHnl, 21037.5)
  })
})
