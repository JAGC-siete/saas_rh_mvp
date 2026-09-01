import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  buildModalityIncludesPlainLines,
  getVentasModalityDefinition,
  hardwareFeeMonthly,
  ventasTooManyTerminalsErrorMessage,
  VENTAS_MAX_AUTO_QUOTE_TERMINALS,
} from '../lib/ventas/modality-includes'
import {
  annualPaymentIntroText,
  buildQuotationPlanSummary,
  getContractIncludesLabels,
} from '../lib/ventas/quote-display'
import { formatTerminalSelectLabel } from '../lib/ventas-game/ventas-form'
import { generateVentasQuotationEmailText } from '../lib/ventas/email-template'
import type { QuotationQuote } from '../lib/ventas/types'

describe('ventas modality includes', () => {
  it('plan anual ≥51 incluye terminal biométrica', () => {
    const def = getVentasModalityDefinition('annual', { employeesCount: 51 })
    assert.ok(def.includes.some((i) => /terminales biométricas incluidas/i.test(i)))
    assert.ok(def.excludesOrNotes.some((n) => /adicionales/i.test(n) && /por separado/i.test(n)))
  })

  it('plan anual <51 cotiza terminal por venta', () => {
    const def = getVentasModalityDefinition('annual', { employeesCount: 50 })
    assert.ok(!def.includes.some((i) => i.toLowerCase().includes('terminal biométrica incluida')))
    assert.ok(def.excludesOrNotes.some((n) => n.toLowerCase().includes('6,500') || n.toLowerCase().includes('6500')))
  })

  it('plan mensual: terminal con continuidad', () => {
    const def = getVentasModalityDefinition('monthly', { employeesCount: 30 })
    assert.ok(def.excludesOrNotes.some((n) => n.toLowerCase().includes('continuidad')))
    const plain = buildModalityIncludesPlainLines('monthly', { employeesCount: 30 }).join('\n')
    assert.match(plain, /Migración y sincronización/)
    assert.match(plain, /Continuidad/i)
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
      hardware_sale_total: 0,
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

  it('mensaje unificado para más terminales del tope del formulario', () => {
    assert.match(ventasTooManyTerminalsErrorMessage(), new RegExp(String(VENTAS_MAX_AUTO_QUOTE_TERMINALS)))
  })

  it('plan summary anual ≥51 no incluye hardware', () => {
    const quote: QuotationQuote = {
      tier: { min_employees: 51, max_employees: 70 },
      billing_modality: 'annual',
      currency: 'HNL',
      annual_subtotal: 76500,
      annual_discount_amount: 0,
      annual_total: 76500,
      monthly_software_total: 6375,
      monthly_hardware_fee: 0,
      monthly_total: 6375,
      hardware_sale_total: 0,
      coupon_applied: false,
      discount_pct_applied: 0,
      terminals_count: 2,
      employees_count: 60,
      hardware_mode: 'included',
      terminals_included_count: 2,
      terminals_extra_count: 0,
    }
    const summary = buildQuotationPlanSummary({ quote })
    assert.equal(summary.isMonthly, false)
    assert.equal(summary.lines.some((l) => l.label.includes('Hardware') || l.label.includes('venta')), false)
  })

  it('plan summary anual con extras suma terminales al compromiso', () => {
    const quote: QuotationQuote = {
      tier: {
        min_employees: 11,
        max_employees: 100,
        annual_terminal_mode: 'included',
        included_terminals_max: 3,
      },
      billing_modality: 'annual',
      currency: 'HNL',
      annual_subtotal: 45000.41,
      annual_discount_amount: 0,
      annual_total: 45000.41,
      monthly_software_total: 3750.03,
      monthly_hardware_fee: 0,
      monthly_total: 3750.03,
      hardware_sale_total: 12000,
      hardware_sale_unit_price: 7500,
      hardware_sale_discount_pct: 0.2,
      coupon_applied: false,
      discount_pct_applied: 0,
      terminals_count: 5,
      employees_count: 40,
      hardware_mode: 'included',
      terminals_included_count: 3,
      terminals_extra_count: 2,
    }
    const summary = buildQuotationPlanSummary({ quote })
    assert.equal(summary.isMonthly, false)
    assert.ok(summary.lines.some((l) => /adicionales/i.test(l.label) && /−20%/.test(l.label)))
    assert.match(summary.totalLabel, /compromiso/i)
    assert.match(summary.totalValue, /57,000\.41/)
  })

  it('plan summary anual 11–50 cap 2 con extras suma terminales al compromiso', () => {
    const quote: QuotationQuote = {
      tier: {
        min_employees: 11,
        max_employees: 50,
        annual_terminal_mode: 'included',
        included_terminals_max: 2,
      },
      billing_modality: 'annual',
      currency: 'HNL',
      annual_subtotal: 35000.77,
      annual_discount_amount: 0,
      annual_total: 35000.77,
      monthly_software_total: 2916.73,
      monthly_hardware_fee: 0,
      monthly_total: 2916.73,
      hardware_sale_total: 15600,
      hardware_sale_unit_price: 6500,
      hardware_sale_discount_pct: 0.2,
      coupon_applied: false,
      discount_pct_applied: 0,
      terminals_count: 5,
      employees_count: 40,
      hardware_mode: 'included',
      terminals_included_count: 2,
      terminals_extra_count: 3,
    }
    const summary = buildQuotationPlanSummary({ quote })
    assert.ok(summary.lines.some((l) => /adicionales/i.test(l.label) && /−20%/.test(l.label)))
    assert.match(summary.totalLabel, /compromiso/i)
    assert.match(summary.totalValue, /50,600\.77/)
  })

  it('PDF includes copy: cap 2 sin extras vs extras', () => {
    const withCap = getContractIncludesLabels({
      isAnnual: true,
      terminalsCount: 2,
      includesTerminals: true,
      hardwareMode: 'included',
      includedCount: 2,
      extraCount: 0,
      includedCap: 2,
    })
    assert.ok(withCap.some((l) => /Hasta 2 terminales biométricas incluidas/i.test(l)))

    const withExtras = getContractIncludesLabels({
      isAnnual: true,
      terminalsCount: 5,
      includesTerminals: true,
      hardwareMode: 'included',
      includedCount: 2,
      extraCount: 3,
      includedCap: 2,
    })
    assert.ok(withExtras.some((l) => /2 terminales incluidas \+ 3 adicionales/i.test(l)))
  })

  it('PDF payment intro: venta vs incluidas vs extras', () => {
    assert.match(
      annualPaymentIntroText({ includesTerminals: false, hardwareSaleTotal: 12350 }),
      /licencia anual \+ terminales en venta/
    )
    assert.match(
      annualPaymentIntroText({ includesTerminals: true, hardwareSaleTotal: 15600 }),
      /terminales adicionales/
    )
    assert.match(
      annualPaymentIntroText({ includesTerminals: true, hardwareSaleTotal: 0 }),
      /50% anticipo \(licencia anual\)/
    )
  })

  it('form terminal labels: sale, included cap 2, extras', () => {
    assert.equal(
      formatTerminalSelectLabel({ n: 1, hardwareMode: 'sale', includedCap: 5 }),
      '1 terminal (venta aparte)'
    )
    assert.equal(
      formatTerminalSelectLabel({ n: 2, hardwareMode: 'sale', includedCap: 5 }),
      '2 terminales (venta, −5%)'
    )
    assert.equal(
      formatTerminalSelectLabel({ n: 2, hardwareMode: 'included', includedCap: 2 }),
      '2 terminales (incluidas)'
    )
    assert.equal(
      formatTerminalSelectLabel({ n: 4, hardwareMode: 'included', includedCap: 2 }),
      '4 terminales (2 incluidas + 2 adicionales)'
    )
    assert.equal(
      formatTerminalSelectLabel({ n: 4, hardwareMode: 'included', includedCap: 3 }),
      '4 terminales (3 incluidas + 1 adicional)'
    )
  })

  it('email anual 2–10 venta aparte muestra línea de terminales en venta', () => {
    const quote: QuotationQuote = {
      tier: {
        min_employees: 2,
        max_employees: 10,
        annual_terminal_mode: 'sale',
        included_terminals_max: 5,
      },
      billing_modality: 'annual',
      currency: 'HNL',
      annual_subtotal: 17507.7,
      annual_discount_amount: 0,
      annual_total: 17507.7,
      monthly_software_total: 1458.98,
      monthly_hardware_fee: 0,
      monthly_total: 1458.98,
      hardware_sale_total: 6500,
      hardware_sale_unit_price: 6500,
      hardware_sale_discount_pct: 0,
      coupon_applied: false,
      discount_pct_applied: 0,
      terminals_count: 1,
      employees_count: 8,
      hardware_mode: 'sale',
      terminals_included_count: 0,
      terminals_extra_count: 1,
    }
    const text = generateVentasQuotationEmailText({
      quote,
      countryLabel: 'Honduras',
      sentAt: new Date('2026-05-22T12:00:00.000Z'),
      now: new Date('2026-05-22T12:00:00.000Z'),
    })
    assert.match(text, /venta/)
    assert.match(text, /2 a 10 empleados/)
    assert.match(text, /24,007\.70/)
  })

  it('plan summary anual <51 muestra venta de terminales', () => {
    const quote: QuotationQuote = {
      tier: { min_employees: 11, max_employees: 20 },
      billing_modality: 'annual',
      currency: 'HNL',
      annual_subtotal: 15000,
      annual_discount_amount: 0,
      annual_total: 15000,
      monthly_software_total: 1250,
      monthly_hardware_fee: 0,
      monthly_total: 1250,
      hardware_sale_total: 6500,
      hardware_sale_unit_price: 6500,
      hardware_sale_discount_pct: 0,
      coupon_applied: false,
      discount_pct_applied: 0,
      terminals_count: 1,
      employees_count: 14,
    }
    const summary = buildQuotationPlanSummary({ quote })
    assert.equal(summary.isMonthly, false)
    assert.equal(summary.lines.some((l) => l.label.includes('venta')), true)
    assert.match(summary.totalValue, /21,500/)
    assert.equal(summary.lines.some((l) => l.label.includes('Continuidad')), false)
  })
})
