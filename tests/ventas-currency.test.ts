import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  convertVentasMoney,
  currencyNoun,
  localizeQuotationQuote,
  pricesInCurrencyFooter,
} from '../lib/ventas/currency'
import { formatMoney } from '../lib/ventas/pricing'
import { buildQuotationPlanSummary } from '../lib/ventas/quote-display'
import { generateVentasQuotationEmailText } from '../lib/ventas/email-template'
import { generateVentasQuotationPDF } from '../lib/ventas/pdf'
import type { QuotationQuote } from '../lib/ventas/types'

const baseAnnual: QuotationQuote = {
  tier: { min_employees: 1, max_employees: 30 },
  billing_modality: 'annual',
  currency: 'HNL',
  annual_subtotal: 26870,
  annual_discount_amount: 0,
  annual_total: 26870,
  monthly_software_total: 2239.17,
  monthly_hardware_fee: 0,
  monthly_total: 2239.17,
  hardware_sale_total: 6500,
  hardware_sale_unit_price: 6500,
  coupon_applied: false,
  discount_pct_applied: 0,
  terminals_count: 1,
  employees_count: 25,
}

describe('ventas currency localization', () => {
  it('maps nouns and footer by currency', () => {
    assert.equal(currencyNoun('HNL'), 'lempiras')
    assert.equal(currencyNoun('USD'), 'dólares')
    assert.equal(currencyNoun('GTQ'), 'quetzales')
    assert.equal(pricesInCurrencyFooter('USD'), 'Precios en dólares')
  })

  it('converts HNL list amounts to USD and GTQ', () => {
    assert.equal(convertVentasMoney(26870, 'HNL', 'USD'), 1000)
    assert.equal(convertVentasMoney(7750, 'HNL', 'GTQ'), 2235.3)
  })

  it('localizes quote money fields and formatMoney prefixes', () => {
    const usd = localizeQuotationQuote(baseAnnual, 'HNL', 'USD')
    assert.equal(usd.currency, 'USD')
    assert.equal(usd.annual_total, 1000)
    assert.equal(formatMoney(usd.currency, usd.annual_total), '$1,000.00')

    const gtq = localizeQuotationQuote(baseAnnual, 'HNL', 'GTQ')
    assert.equal(gtq.currency, 'GTQ')
    assert.match(formatMoney(gtq.currency, gtq.annual_total), /^Q /)
  })

  it('email and plan summary localize monthly/annual amounts by country currency', () => {
    const usd = localizeQuotationQuote(
      { ...baseAnnual, billing_modality: 'monthly', monthly_hardware_fee: 958.33, monthly_total: 3197.5 },
      'HNL',
      'USD'
    )
    const usdText = generateVentasQuotationEmailText({
      quote: usd,
      contactName: 'Ana',
      companyName: 'SV Co',
      countryLabel: 'El Salvador',
      sentAt: new Date('2026-07-21T12:00:00.000Z'),
    })
    assert.match(usdText, /\$/)
    assert.doesNotMatch(usdText, /L\.\s/)
    assert.match(buildQuotationPlanSummary({ quote: usd }).totalValue, /^\$/)

    const gtq = localizeQuotationQuote(baseAnnual, 'HNL', 'GTQ')
    const gtqText = generateVentasQuotationEmailText({
      quote: gtq,
      contactName: 'Luis',
      companyName: 'GT Co',
      countryLabel: 'Guatemala',
      sentAt: new Date('2026-07-21T12:00:00.000Z'),
    })
    assert.match(gtqText, /Q /)
    assert.doesNotMatch(gtqText, /L\.\s/)
    assert.equal(pricesInCurrencyFooter(gtq.currency), 'Precios en quetzales')
  })

  it('pdf generates for USD and GTQ quotes without throwing', async () => {
    const sentAt = new Date('2026-07-21T12:00:00.000Z')
    for (const currency of ['USD', 'GTQ'] as const) {
      const quote = localizeQuotationQuote(baseAnnual, 'HNL', currency)
      const pdf = await generateVentasQuotationPDF({
        quote,
        contactEmail: 'a@test.com',
        countryLabel: currency === 'USD' ? 'El Salvador' : 'Guatemala',
        employeesCount: 25,
        sentAt,
      })
      assert.ok(Buffer.isBuffer(pdf))
      assert.ok(pdf.length > 1200)
    }
  })
})
