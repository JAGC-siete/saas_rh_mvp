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
  tier: { min_employees: 21, max_employees: 50 },
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
  employees_count: 30,
}

const annualQuote: QuotationQuote = {
  ...monthlyQuote,
  billing_modality: 'annual',
  monthly_hardware_fee: 958.33,
  monthly_total: 6375,
  employees_count: 30,
}

const annualLargeQuote: QuotationQuote = {
  ...monthlyQuote,
  tier: { min_employees: 71, max_employees: 90 },
  billing_modality: 'annual',
  monthly_hardware_fee: 0,
  monthly_total: 5416.67,
  employees_count: 80,
}

describe('ventas modality comparison', () => {
  const sentAt = new Date('2026-05-22T12:00:00.000Z')

  it('monthly primary shows annual reference without monthly equivalent note', () => {
    const comparison = buildModalityComparison({ quote: monthlyQuote, sentAt, now: sentAt })
    assert.ok(comparison)
    assert.equal(comparison.alternateModality, 'annual')
    assert.match(comparison.title, /Plan Anual/)
    assert.match(comparison.totalValue, /65,000\.00 \/ año/)
    assert.equal(comparison.equivalentNote, null)
    assert.match(comparison.footnote, /terminal biométrica/i)
    assert.doesNotMatch(comparison.footnote, /72 h/)
  })

  it('annual primary (≥21) shows monthly reference without urgency discount', () => {
    const comparison = buildModalityComparison({ quote: annualQuote, sentAt, now: sentAt })
    assert.ok(comparison)
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

  it('annual primary <21 omits monthly comparison', () => {
    const smallAnnual: QuotationQuote = {
      ...annualQuote,
      tier: { min_employees: 1, max_employees: 10 },
      employees_count: 15,
      monthly_hardware_fee: 958.33,
    }
    const comparison = buildModalityComparison({ quote: smallAnnual, sentAt, now: sentAt })
    assert.equal(comparison, null)
  })

  it('annual ≥71 footnote says terminals included', () => {
    const comparison = buildModalityComparison({
      quote: { ...monthlyQuote, billing_modality: 'monthly', employees_count: 80 },
      sentAt,
      now: sentAt,
    })
    assert.ok(comparison)
    assert.match(comparison.footnote, /Incluye terminal biométrica/i)
  })

  it('monthly primary has no 72h offer; alternate annual stays at list price', () => {
    const primary = buildQuotationPlanSummary({ quote: monthlyQuote, sentAt, now: sentAt })
    const comparison = buildModalityComparison({ quote: monthlyQuote, sentAt, now: sentAt })
    assert.ok(comparison)

    assert.equal(primary.urgency.isActive, false)
    assert.match(primary.totalValue, /6,375\.00 \/ mes/)
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
      quote: annualLargeQuote,
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

  it('plain text builder returns footnote without 72h when primary is monthly', () => {
    const comparison = buildModalityComparison({ quote: monthlyQuote, sentAt, now: sentAt })
    assert.ok(comparison)
    const lines = buildModalityComparisonPlainText(comparison)
    assert.ok(lines.some((l) => l.includes('Referencia — Plan Anual')))
    assert.ok(lines.every((l) => !l.includes('72 h')))
  })
})
