import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { formatMoneyForCountry } from '../lib/country/display-money'

describe('formatMoneyForCountry', () => {
  it('keeps two decimals by default', () => {
    assert.match(formatMoneyForCountry(1234.5, 'HND'), /1,234\.50/)
  })

  it('does not throw when only maximumFractionDigits is lowered (dashboard regression)', () => {
    assert.doesNotThrow(() => formatMoneyForCountry(958400.4, 'HND', { maximumFractionDigits: 0 }))
    assert.match(formatMoneyForCountry(958400.4, 'HND', { maximumFractionDigits: 0 }), /958,400(?![.,]\d)/)
  })

  it('honors explicit min and max', () => {
    assert.match(formatMoneyForCountry(10, 'SLV', { minimumFractionDigits: 0, maximumFractionDigits: 0 }), /10(?![.,]\d)/)
  })
})
