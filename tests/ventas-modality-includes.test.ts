import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  buildModalityIncludesPlainLines,
  getVentasModalityDefinition,
  ventasTooManyTerminalsErrorMessage,
} from '../lib/ventas/modality-includes'
import { generateVentasQuotationEmailText } from '../lib/ventas/email-template'
import type { QuotationQuote } from '../lib/ventas/types'

describe('ventas modality includes', () => {
  it('plan anual incluye terminal biométrica', () => {
    const def = getVentasModalityDefinition('annual')
    assert.ok(def.includes.some((i) => i.toLowerCase().includes('terminal biométrica incluida')))
    assert.ok(!def.excludesOrNotes.some((n) => n.toLowerCase().includes('vende por separado')))
  })

  it('plan mensual: terminal vendida por separado', () => {
    const def = getVentasModalityDefinition('monthly')
    assert.ok(def.excludesOrNotes.some((n) => n.toLowerCase().includes('vende por separado')))
    const plain = buildModalityIncludesPlainLines('monthly').join('\n')
    assert.match(plain, /Migración y sincronización/)
    assert.match(plain, /vende por separado/i)
  })

  it('ambos planes comparten servicios de implementación', () => {
    for (const modality of ['annual', 'monthly'] as const) {
      const def = getVentasModalityDefinition(modality)
      assert.ok(def.includes.some((i) => i.includes('Instalación')))
      assert.ok(def.includes.some((i) => i.includes('Capacitación')))
      assert.ok(def.includes.some((i) => i.includes('Soporte local')))
    }
  })

  it('email mensual desglosa software y continuidad hardware', () => {
    const quote: QuotationQuote = {
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
    const text = generateVentasQuotationEmailText({
      quote,
      countryLabel: 'Honduras',
      sentAt: new Date('2026-05-22T12:00:00.000Z'),
    })
    assert.match(text, /Lo que incluye tu Plan Mensual/)
    assert.match(text, /Licencia mensual de software/)
    assert.match(text, /terminal biométrica.*vende por separado/i)
  })

  it('mensaje unificado para más de 3 terminales', () => {
    assert.match(ventasTooManyTerminalsErrorMessage(), /modalidad anual o mensual/i)
  })
})
