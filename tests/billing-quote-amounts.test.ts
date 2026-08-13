import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { computeFrozenQuoteAmounts } from '../lib/billing/quote-amounts'

describe('computeFrozenQuoteAmounts', () => {
  it('monthly deposit is 100% of first month (software + HW)', () => {
    const result = computeFrozenQuoteAmounts({
      billingModality: 'monthly',
      monthlySoftwareTotal: 6375,
      monthlyHardwareFee: 1821.66,
      annualTotal: 76500,
    })

    assert.equal(result.expectedTotalHnl, 8196.66)
    assert.equal(result.expectedDepositHnl, 8196.66)
  })

  it('annual without sale: 50% of software only', () => {
    const result = computeFrozenQuoteAmounts({
      billingModality: 'annual',
      monthlySoftwareTotal: 6375,
      monthlyHardwareFee: 0,
      annualTotal: 42075,
      hardwareSaleTotal: 0,
    })

    assert.equal(result.expectedTotalHnl, 42075)
    assert.equal(result.expectedDepositHnl, 21037.5)
  })

  it('annual with terminal sale: 50% of (software + sale)', () => {
    const result = computeFrozenQuoteAmounts({
      billingModality: 'annual',
      monthlySoftwareTotal: 1250,
      monthlyHardwareFee: 0,
      annualTotal: 15000,
      hardwareSaleTotal: 6500,
    })

    assert.equal(result.expectedTotalHnl, 21500)
    assert.equal(result.expectedDepositHnl, 10750)
  })
})
