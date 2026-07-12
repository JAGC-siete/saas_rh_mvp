import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  buildModalityIncludesPlainLines,
  getVentasModalityDefinition,
  hardwareFeeMonthly,
  ventasTooManyTerminalsErrorMessage,
  VENTAS_MAX_AUTO_QUOTE_TERMINALS,
} from '../lib/ventas/modality-includes'
import { buildQuotationPlanSummary } from '../lib/ventas/quote-display'
import { generateVentasQuotationEmailText } from '../lib/ventas/email-template'
import type { QuotationQuote } from '../lib/ventas/types'

describe('ventas modality includes', () => {
  it('plan anual ≥71 incluye terminal biométrica', () => {
    const def = getVentasModalityDefinition('annual', { employeesCount: 71 })
    assert.ok(def.includes.some((i) => i.toLowerCase().includes('terminal biométrica incluida')))
    assert.ok(!def.excludesOrNotes.some((n) => n.toLowerCase().includes('por separado')))
  })

  it('plan anual <71 cotiza terminal por continuidad de hardware', () => {
    const def = getVentasModalityDefinition('annual', { employeesCount: 70 })
    assert.ok(!def.includes.some((i) => i.toLowerCase().includes('terminal biométrica incluida')))
    assert.ok(def.excludesOrNotes.some((n) => n.toLowerCase().includes('por separado')))
  })

  it('plan mensual: terminal vendida por separado', () => {
    const def = getVentasModalityDefinition('monthly', { employeesCount: 30 })
    assert.ok(def.excludesOrNotes.some((n) => n.toLowerCase().includes('por separado')))
    const plain = buildModalityIncludesPlainLines('monthly', { employeesCount: 30 }).join('\n')
    assert.match(plain, /Migración y sincronización/)
    assert.match(plain, /por separado/i)
  })

  it('ambos planes comparten servicios de implementación', () => {
    for (const modality of ['annual', 'monthly'] as const) {
      const def = getVentasModalityDefinition(modality, { employeesCount: 80 })
      assert.ok(def.includes.some((i) => i.includes('Instalación')))
      assert.ok(def.includes.some((i) => i.includes('Capacitación')))
      assert.ok(def.includes.some((i) => i.includes('Soporte local')))
    }
  })

  it('email mensual muestra precio de lista sin descuento por contratación temprana', () => {
    const quote: QuotationQuote = {
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
    const sentAt = new Date('2026-05-22T12:00:00.000Z')
    const text = generateVentasQuotationEmailText({
      quote,
      countryLabel: 'Honduras',
      sentAt,
      now: sentAt,
    })
    assert.match(text, /Precio Software: L\.\s?5,416\.67 \/ mes/)
    assert.match(text, /Servicio de Continuidad de Hardware \(1 Terminal\): L\.\s?958\.33 \/ mes/)
    assert.match(text, /Total mensual cotizado: L\.\s?6,375\.00 \/ mes/)
    assert.doesNotMatch(text, /Ahorro exclusivo por contratación temprana/)
  })

  it('hardware fee decrece por terminal hasta el piso', () => {
    assert.equal(hardwareFeeMonthly(1).fee, 958.33)
    assert.equal(hardwareFeeMonthly(2).fee, 1821.66)
    assert.equal(hardwareFeeMonthly(4).fee, 3263.32)
    assert.equal(hardwareFeeMonthly(5).fee, 3936.65)
  })

  it('mensaje unificado para más de 10 terminales', () => {
    assert.match(ventasTooManyTerminalsErrorMessage(), new RegExp(String(VENTAS_MAX_AUTO_QUOTE_TERMINALS)))
  })

  it('plan summary anual ≥71 no incluye hardware', () => {
    const quote: QuotationQuote = {
      tier: { min_employees: 71, max_employees: 90 },
      billing_modality: 'annual',
      currency: 'HNL',
      annual_subtotal: 76500,
      annual_discount_amount: 0,
      annual_total: 76500,
      monthly_software_total: 6375,
      monthly_hardware_fee: 0,
      monthly_total: 6375,
      coupon_applied: false,
      discount_pct_applied: 0,
      terminals_count: 2,
      employees_count: 80,
    }
    const summary = buildQuotationPlanSummary({ quote })
    assert.equal(summary.isMonthly, false)
    assert.equal(
      summary.lines.some((l) => l.label.includes('Hardware')),
      false
    )
  })

  it('plan summary anual <71 muestra continuidad de hardware', () => {
    const quote: QuotationQuote = {
      tier: { min_employees: 21, max_employees: 50 },
      billing_modality: 'annual',
      currency: 'HNL',
      annual_subtotal: 30000,
      annual_discount_amount: 0,
      annual_total: 30000,
      monthly_software_total: 2500,
      monthly_hardware_fee: 958.33,
      monthly_total: 3458.33,
      coupon_applied: false,
      discount_pct_applied: 0,
      terminals_count: 1,
      employees_count: 40,
    }
    const summary = buildQuotationPlanSummary({ quote })
    assert.equal(summary.isMonthly, false)
    assert.equal(
      summary.lines.some((l) => l.label.includes('Hardware')),
      true
    )
    assert.match(summary.totalValue, /30,000\.00 \/ año/)
  })
})
