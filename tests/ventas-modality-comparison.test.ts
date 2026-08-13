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
  annual_subtotal: 30000,
  annual_discount_amount: 0,
  annual_total: 30000,
  monthly_software_total: 2500,
  monthly_hardware_fee: 958.33,
  monthly_total: 3458.33,
  hardware_sale_total: 0,
  coupon_applied: false,
  discount_pct_applied: 0,
  terminals_count: 1,
  employees_count: 30,
}

const annualSaleQuote: QuotationQuote = {
  ...monthlyQuote,
  billing_modality: 'annual',
  monthly_hardware_fee: 0,
  monthly_total: 2500,
  hardware_sale_total: 6500,
  hardware_sale_unit_price: 6500,
  hardware_sale_discount_pct: 0,
  employees_count: 30,
}

const annualIncludedQuote: QuotationQuote = {
  ...monthlyQuote,
  tier: { min_employees: 51, max_employees: 70 },
  billing_modality: 'annual',
  annual_subtotal: 45000,
  annual_total: 45000,
  monthly_software_total: 3750,
  monthly_hardware_fee: 0,
  monthly_total: 3750,
  hardware_sale_total: 0,
  employees_count: 60,
}

describe('ventas modality comparison', () => {
  const sentAt = new Date('2026-05-22T12:00:00.000Z')

  it('monthly primary shows annual reference with sale footnote when <51', () => {
    const comparison = buildModalityComparison({ quote: monthlyQuote, sentAt, now: sentAt })
    assert.ok(comparison)
    assert.equal(comparison.alternateModality, 'annual')
    assert.match(comparison.title, /Plan Anual/)
    assert.match(comparison.footnote, /vende por separado/i)
  })

  it('annual primary (≥21) shows monthly reference with continuity', () => {
    const comparison = buildModalityComparison({ quote: annualSaleQuote, sentAt, now: sentAt })
    assert.ok(comparison)
    assert.equal(comparison.alternateModality, 'monthly')
    assert.match(comparison.title, /Plan Mensual/)
    assert.equal(comparison.lines.some((l) => l.label.includes('Hardware')), true)
    assert.match(comparison.footnote, /cotiza por separado/i)
  })

  it('annual primary <21 omits monthly comparison', () => {
    const smallAnnual: QuotationQuote = {
      ...annualSaleQuote,
      tier: { min_employees: 1, max_employees: 10 },
      employees_count: 15,
    }
    const comparison = buildModalityComparison({ quote: smallAnnual, sentAt, now: sentAt })
    assert.equal(comparison, null)
  })

  it('annual ≥51 footnote says terminals included', () => {
    const comparison = buildModalityComparison({
      quote: { ...monthlyQuote, employees_count: 60 },
      sentAt,
      now: sentAt,
    })
    assert.ok(comparison)
    assert.match(comparison.footnote, /Incluye terminal biométrica/i)
  })

  it('monthly primary has no 72h offer', () => {
    const primary = buildQuotationPlanSummary({ quote: monthlyQuote, sentAt, now: sentAt })
    const comparison = buildModalityComparison({ quote: monthlyQuote, sentAt, now: sentAt })
    assert.ok(comparison)

    assert.equal(primary.urgency.isActive, false)
    assert.match(primary.totalValue, /3,458\.33 \/ mes/)
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
      quote: annualIncludedQuote,
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
  })

  it('comparison snapshot stores both modality totals', () => {
    const snapshot = buildModalityComparisonSnapshot(monthlyQuote)
    assert.equal(snapshot.primary, 'monthly')
    assert.equal(snapshot.annual_total, 30000)
    assert.equal(snapshot.monthly_total, 3458.33)
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
