import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'

import { buildQuotationPlanSummary } from '../lib/ventas/quote-display'
import {
  buildBankDetailsPlainText,
  buildQuotationAcquisitionWhatsAppText,
  getVentasBankDetailsFromEnv,
} from '../lib/ventas/bank-details'
import { generateVentasQuotationEmailText } from '../lib/ventas/email-template'
import type { QuotationQuote } from '../lib/ventas/types'

const monthlyQuote: QuotationQuote = {
  tier: { min_employees: 1, max_employees: 30 },
  billing_modality: 'monthly',
  currency: 'HNL',
  annual_subtotal: 76500,
  annual_discount_amount: 0,
  annual_total: 76500,
  monthly_software_total: 6375,
  monthly_hardware_fee: 1821.66,
  monthly_total: 8196.66,
  coupon_applied: false,
  discount_pct_applied: 0,
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

  it('annual primary keeps 72h discount on software only', () => {
    const sentAt = new Date('2026-05-22T12:00:00.000Z')
    const annualQuote: QuotationQuote = {
      ...monthlyQuote,
      billing_modality: 'annual',
      monthly_hardware_fee: 0,
      monthly_total: 5416.67,
    }
    const summary = buildQuotationPlanSummary({ quote: annualQuote, sentAt, now: sentAt })
    const text = generateVentasQuotationEmailText({
      quote: annualQuote,
      contactName: 'Alejandra',
      companyName: 'Grupo Infinitum',
      countryLabel: 'Honduras',
      sentAt,
      now: sentAt,
    })

    assert.equal(summary.urgency.isActive, true)
    assert.equal(summary.urgency.softwareDiscountAmount, 15300)
    assert.equal(summary.urgency.discountedTotal, 61200)
    assert.match(text, /verdaderamente queremos ayudarte/)
    assert.match(text, /Precio anual con 2 terminales incluidas: L\.\s?76,500\.00 \/ año/)
    assert.match(text, /Tu inversión anual total hoy/)
    assert.match(text, /L\.\s?61,200\.00 \/ año/)
    assert.match(text, /Ahorro exclusivo por contratación temprana: L\.\s?15,300\.00/)
  })

  it('monthly quote has no 72h early-contract discount', () => {
    const sentAt = new Date('2026-05-22T12:00:00.000Z')
    const summary = buildQuotationPlanSummary({ quote: monthlyQuote, sentAt, now: sentAt })
    const text = generateVentasQuotationEmailText({
      quote: monthlyQuote,
      contactName: 'Alejandra',
      companyName: 'Grupo Infinitum',
      countryLabel: 'Honduras',
      sentAt,
      now: sentAt,
    })

    assert.equal(summary.urgency.isActive, false)
    assert.equal(summary.urgency.softwareDiscountAmount, 0)
    assert.equal(summary.urgency.discountedTotal, 8196.66)
    assert.match(text, /Precio Software: L\.\s?6,375\.00 \/ mes/)
    assert.match(text, /Servicio de Continuidad de Hardware \(2 Terminales\): L\.\s?1,821\.66 \/ mes/)
    assert.match(text, /Total mensual cotizado: L\.\s?8,196\.66 \/ mes/)
    assert.doesNotMatch(text, /Ahorro exclusivo por contratación temprana/)
    assert.doesNotMatch(text, /verdaderamente queremos ayudarte/)
  })

  it('WhatsApp message references quote review and 50% comprobante', () => {
    const msg = buildQuotationAcquisitionWhatsAppText({
      contactName: 'María López',
      companyName: 'Acme SA',
      includeBankPrompt: true,
      supportFirstName: 'Jorge',
    })

    assert.match(msg, /Hola Jorge, soy María\./)
    assert.match(msg, /cotización de Humano SISU para Acme SA/)
    assert.match(msg, /comprobante del 50%/)
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
