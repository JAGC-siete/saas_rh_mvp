import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  buildModalityComparison,
  buildModalityComparisonPlainText,
  buildModalityComparisonSnapshot,
} from '../lib/ventas/modality-comparison'
import { buildQuotationPlanSummary } from '../lib/ventas/quote-display'
import { generateVentasQuotationEmailText } from '../lib/ventas/email-template'
import type { QuotationQuote } from '../lib/ventas/types'

const monthlyQuote: QuotationQuote = {
  tier: { min_employees: 1, max_employees: 30 },
  billing_modality: 'monthly',
  currency: 'HNL',
  annual_subtotal: 65000,
  annual_discount_amount: 0,
  annual_total: 65000,
  monthly_software_total: 5416.67,
  monthly_hardware_fee: 958.33,
  monthly_total: 6375,
  coupon_applied: false,
  discount_pct_applied: 0,
  terminals_count: 1,
}

const annualQuote: QuotationQuote = {
  ...monthlyQuote,
  billing_modality: 'annual',
  monthly_hardware_fee: 0,
  monthly_total: 5416.67,
}

describe('ventas modality comparison', () => {
  const sentAt = new Date('2026-05-22T12:00:00.000Z')

  it('monthly primary shows annual reference with equivalent note', () => {
    const comparison = buildModalityComparison({ quote: monthlyQuote, sentAt, now: sentAt })

    assert.equal(comparison.alternateModality, 'annual')
    assert.match(comparison.title, /Plan Anual/)
    assert.match(comparison.totalValue, /65,000\.00 \/ año/)
    assert.ok(comparison.equivalentNote?.includes('≈'))
    assert.match(comparison.footnote, /terminal biométrica/i)
    assert.match(comparison.footnote, /72 h/)
  })

  it('annual primary shows monthly reference without urgency discount', () => {
    const comparison = buildModalityComparison({ quote: annualQuote, sentAt, now: sentAt })

    assert.equal(comparison.alternateModality, 'monthly')
    assert.match(comparison.title, /Plan Mensual/)
    assert.equal(
      comparison.lines.some((l) => l.label.includes('Hardware')),
      true
    )
    assert.match(comparison.totalValue, /6,375\.00 \/ mes/)
    assert.equal(comparison.equivalentNote, null)
    assert.match(comparison.footnote, /cotiza por separado/i)
  })

  it('alternate modality uses list price when primary has 72h offer', () => {
    const primary = buildQuotationPlanSummary({ quote: monthlyQuote, sentAt, now: sentAt })
    const comparison = buildModalityComparison({ quote: monthlyQuote, sentAt, now: sentAt })

    assert.equal(primary.urgency.isActive, true)
    assert.match(primary.totalValue, /5,291\.67 \/ mes/)
    assert.match(comparison.totalValue, /65,000\.00 \/ año/)
  })

  it('email text omits comparison block (lives in PDF only)', () => {
    const monthlyText = generateVentasQuotationEmailText({
      quote: monthlyQuote,
      countryLabel: 'Honduras',
      sentAt,
      now: sentAt,
      bankDetails: {
        bacAccount: '722983451',
        clientName: 'CLIENTE DEMO',
      },
    })
    const annualText = generateVentasQuotationEmailText({
      quote: annualQuote,
      countryLabel: 'Honduras',
      sentAt,
      now: sentAt,
      bankDetails: {
        bacAccount: '722983451',
        clientName: 'CLIENTE DEMO',
      },
    })

    assert.doesNotMatch(monthlyText, /Referencia — Plan Anual/)
    assert.doesNotMatch(annualText, /Referencia — Plan Mensual/)
    assert.match(monthlyText, /PDF adjunto/)
    assert.doesNotMatch(monthlyText, /Número de cuenta BAC/)
    assert.doesNotMatch(monthlyText, /reportar tu pago/i)
  })

  it('comparison snapshot stores both modality totals', () => {
    const snapshot = buildModalityComparisonSnapshot(monthlyQuote)
    assert.equal(snapshot.primary, 'monthly')
    assert.equal(snapshot.annual_total, 65000)
    assert.equal(snapshot.monthly_total, 6375)
    assert.equal(snapshot.currency, 'HNL')
  })

  it('plain text builder returns footnote', () => {
    const lines = buildModalityComparisonPlainText(
      buildModalityComparison({ quote: monthlyQuote, sentAt, now: sentAt })
    )
    assert.ok(lines.some((l) => l.includes('Referencia — Plan Anual')))
    assert.ok(lines.some((l) => l.includes('72 h')))
  })
})
