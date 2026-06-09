import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { generateVentasQuotationEmailHTML, generateVentasQuotationEmailText } from '../lib/ventas/email-template'
import type { QuotationQuote } from '../lib/ventas/types'

const quote: QuotationQuote = {
  tier: { min_employees: 1, max_employees: 30 },
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
}

describe('ventas lean quotation email', () => {
  const sentAt = new Date('2026-05-22T12:00:00.000Z')
  const bankDetails = {
    bacAccount: '722983451',
    clientName: 'CLIENTE DEMO',
    clientDni: '0510199100731',
  }

  it('html focuses on total, expiry and WhatsApp CTA', () => {
    const html = generateVentasQuotationEmailHTML({
      quote,
      contactName: 'Carlos',
      companyName: 'Acme SA',
      countryLabel: 'Honduras',
      sentAt,
      now: sentAt,
      bankDetails,
    })

    assert.match(html, /COTIZACIÓN ANUAL/)
    assert.match(html, /# de terminales/)
    assert.match(html, /Precio anual con 1 terminal incluida/)
    assert.match(html, /Ahorro exclusivo por contratación temprana/)
    assert.match(html, /Oferta vigente hasta/)
    assert.match(html, /Continuar por WhatsApp/)
    assert.match(html, /PDF adjunto/)
    assert.doesNotMatch(html, /Datos Bancarios/)
    assert.doesNotMatch(html, /Referencia —/)
  })

  it('text uses simple WhatsApp message without comprobante prompt', () => {
    const text = generateVentasQuotationEmailText({
      quote,
      contactName: 'Carlos',
      companyName: 'Acme SA',
      countryLabel: 'Honduras',
      sentAt,
      now: sentAt,
      bankDetails,
    })

    assert.match(text, /# de terminales:/)
    assert.match(text, /Precio anual con 1 terminal incluida:/)
    assert.match(text, /Ahorro exclusivo por contratación temprana/)
    assert.match(text, /proceso%20de%20contrataci/i)
    assert.doesNotMatch(text, /comprobante del 50%/)
    assert.doesNotMatch(text, /Número de cuenta BAC/)
  })
})
