import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'

import { computeUrgencyOffer } from '../lib/ventas/urgency-offer'
import {
  buildBankDetailsPlainText,
  buildQuotationAcquisitionWhatsAppText,
  getVentasBankDetailsFromEnv,
} from '../lib/ventas/bank-details'
import { generateVentasQuotationEmailText } from '../lib/ventas/email-template'
import type { QuotationQuote } from '../lib/ventas/types'

const sampleQuote: QuotationQuote = {
  tier: { min_employees: 11, max_employees: 25 },
  billing_modality: 'annual',
  currency: 'HNL',
  annual_subtotal: 100000,
  annual_discount_amount: 10000,
  annual_total: 90000,
  monthly_software_total: 0,
  monthly_hardware_fee: 0,
  monthly_total: 0,
  coupon_applied: true,
  discount_pct_applied: 0.1,
  terminals_count: 2,
}

describe('ventas quote coherence', () => {
  const envBackup = { ...process.env }

  beforeEach(() => {
    process.env = { ...envBackup }
  })

  afterEach(() => {
    process.env = envBackup
  })

  it('urgency discount matches 20% of quoted total in email text', () => {
    const sentAt = new Date('2026-05-22T12:00:00.000Z')
    const urgency = computeUrgencyOffer({ quotedTotal: sampleQuote.annual_total, sentAt, now: sentAt })
    const text = generateVentasQuotationEmailText({
      quote: sampleQuote,
      contactName: 'Jorge Arturo Gómez',
      companyName: 'Acme SA',
      countryLabel: 'Honduras',
      sentAt,
      now: sentAt,
    })

    assert.equal(urgency.discountAmount, 18000)
    assert.equal(urgency.discountedTotal, 72000)
    assert.match(text, /verdaderamente queremos ayudarte/)
    assert.match(text, /enorme 20% sobre el total anual/)
    assert.match(text, /Precio normal: L\.\s?90,000\.00 \/ año/)
    assert.match(text, /Tu precio hoy: L\.\s?72,000\.00 \/ año/)
    assert.match(text, /Lo que incluye tu Plan Anual/)
    assert.match(text, /Terminal biométrica incluida/)
    assert.match(text, /precio de lista/)
  })

  it('WhatsApp message references quote review and bank confirmation', () => {
    const msg = buildQuotationAcquisitionWhatsAppText({
      contactName: 'María López',
      companyName: 'Acme SA',
      includeBankPrompt: true,
      supportFirstName: 'Jorge',
    })

    assert.match(msg, /Hola Jorge, soy María\./)
    assert.match(msg, /cotización de Humano SISU para Acme SA/)
    assert.match(msg, /confirmar los datos bancarios/)
  })

  it('bank details load from env without hardcoded account numbers', () => {
    process.env.VENTAS_BANK_BAC_ACCOUNT = '722983451'
    process.env.VENTAS_BANK_CLIENT_NAME = 'CLIENTE DEMO'
    process.env.VENTAS_BANK_CLIENT_DNI = '0510199100731'

    const bank = getVentasBankDetailsFromEnv()
    assert.ok(bank)
    const plain = buildBankDetailsPlainText(bank!)
    assert.match(plain, /Número de cuenta BAC: 722983451/)
    assert.match(plain, /Cliente: CLIENTE DEMO/)
    assert.doesNotMatch(plain, /213000317424/)
  })
})
