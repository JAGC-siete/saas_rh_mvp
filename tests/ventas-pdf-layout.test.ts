import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { generateVentasQuotationPDF } from '../lib/ventas/pdf'
import type { QuotationQuote } from '../lib/ventas/types'

const annualQuote: QuotationQuote = {
  tier: { min_employees: 71, max_employees: 90 },
  billing_modality: 'annual',
  currency: 'HNL',
  annual_subtotal: 76500,
  annual_discount_amount: 11500,
  annual_total: 65000,
  monthly_software_total: 5416.67,
  monthly_hardware_fee: 0,
  monthly_total: 5416.67,
  coupon_applied: true,
  discount_pct_applied: 0.45,
  terminals_count: 1,
  employees_count: 80,
}

describe('ventas quotation pdf layout', () => {
  it('generates a non-empty single-page commercial pdf buffer', async () => {
    const sentAt = new Date('2026-05-22T12:00:00.000Z')
    const pdf = await generateVentasQuotationPDF({
      quote: annualQuote,
      contactEmail: 'lead@test.com',
      contactName: 'Carlos Prueba',
      companyName: 'Empresa Prueba Anual S.A.',
      phone: '98765432',
      employeesCount: 80,
      terminalsCount: 1,
      couponCodeSubmitted: 'gastro2026',
      countryLabel: 'Honduras',
      sentAt,
      bankDetails: {
        clientName: 'JORGE ARTURO GOMEZ COELLO',
        clientDni: '0510199100731',
        bacAccount: '722983451',
      },
    })

    assert.ok(Buffer.isBuffer(pdf))
    assert.ok(pdf.length > 1200)

    const raw = pdf.toString('latin1')
    assert.match(raw, /\/Count\s+1\b/)
  })
})
