import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  VENTAS_BASIC_ANNUAL_PRICE,
  VENTAS_MEMBERSHIP_DISCOUNT_PCT,
  mergeVentasBusinessRules,
} from '../lib/ventas/business-rules'
import { FALLBACK_VENTAS_TIERS } from '../lib/ventas/load-ventas-config'
import { resolveVentasProductSelection } from '../lib/ventas/product-catalog'
import { computeVentasQuotationQuote } from '../lib/ventas/compute-quote'
import { getVentasModalityDefinition } from '../lib/ventas/modality-includes'
import { getContractIncludesLabels } from '../lib/ventas/quote-display'
import { resolveTierByEmployees } from '../lib/ventas/pricing'
import { ventasScopeErrors } from '../lib/ventas-game/ventas-form'
import { hasValidationErrors } from '../lib/forms/validation-errors'
import { planTypeFromQuoteFlags } from '../lib/billing/tier-to-plan'

const rules = mergeVentasBusinessRules(null)
const microTier = resolveTierByEmployees(FALLBACK_VENTAS_TIERS, 8)
const regularTier = resolveTierByEmployees(FALLBACK_VENTAS_TIERS, 30)

describe('ventas product catalog', () => {
  it('any N without terminals is membership Basic', () => {
    for (const n of [8, 30, 120]) {
      const p = resolveVentasProductSelection({ employeesCount: n, rules })
      assert.equal(p.kind, 'basic')
      assert.equal(p.chargeHardware, false)
      assert.equal(p.forceAnnual, true)
      assert.equal(p.applyMembershipDiscount, false)
      assert.equal(p.commercialPlanType, 'basic')
    }
  })

  it('any N with terminals is Premium range + hardware', () => {
    const p = resolveVentasProductSelection({
      employeesCount: 8,
      includeTerminals: true,
      rules,
    })
    assert.equal(p.kind, 'regular')
    assert.equal(p.includeTerminals, true)
    assert.equal(p.chargeHardware, true)
    assert.equal(p.commercialPlanType, 'premium')
    assert.ok(microTier)
    assert.equal(microTier.max_employees, 10)
  })

  it('complement_biometric aliases include_terminals on any N', () => {
    const p = resolveVentasProductSelection({
      employeesCount: 30,
      complementBiometric: true,
      affiliateMembership: true,
      rules,
    })
    assert.equal(p.kind, 'regular')
    assert.equal(p.includeTerminals, true)
    assert.equal(p.applyMembershipDiscount, true)
    assert.equal(p.commercialPlanType, 'premium')
  })

  it('membership without terminals does not apply 10%', () => {
    const p = resolveVentasProductSelection({
      employeesCount: 30,
      affiliateMembership: true,
      rules,
    })
    assert.equal(p.kind, 'basic')
    assert.equal(p.applyMembershipDiscount, false)
  })

  it('Enterprise stacks on any range', () => {
    const p = resolveVentasProductSelection({
      employeesCount: 8,
      includeTerminals: false,
      includeEnterprise: true,
      rules,
    })
    assert.equal(p.kind, 'basic')
    assert.equal(p.includeEnterprise, true)
    assert.equal(p.commercialPlanType, 'enterprise')
  })

  it('basic quote uses membership price, 3 modules, no hardware', () => {
    assert.ok(microTier)
    const { quote } = computeVentasQuotationQuote({
      employeesCount: 8,
      billingModality: 'monthly',
      terminalsCount: 3,
      listCurrency: 'HNL',
      tier: microTier,
      businessRules: rules,
      coupon: { applied: true, discountPct: 0.45, code: 'gastro2026' },
    })
    assert.equal(quote.product_kind, 'basic')
    assert.equal(quote.billing_modality, 'annual')
    assert.equal(quote.annual_subtotal, VENTAS_BASIC_ANNUAL_PRICE)
    assert.equal(quote.annual_total, VENTAS_BASIC_ANNUAL_PRICE)
    assert.equal(quote.terminals_count, 0)
    assert.equal(quote.hardware_sale_total, 0)
    assert.equal(quote.coupon_applied, false)
    assert.equal(quote.commercial_plan_type, 'basic')

    const def = getVentasModalityDefinition('annual', {
      employeesCount: 8,
      productKind: 'basic',
    })
    assert.equal(def.includes.length, 3)
    assert.deepEqual(
      getContractIncludesLabels({
        isAnnual: true,
        terminalsCount: 0,
        includesTerminals: false,
        productKind: 'basic',
      }).slice(0, 3),
      ['Expedientes digitales', 'Asistencia por input manual', 'Recibos de nómina']
    )
  })

  it('N>10 without terminals still quotes Basic L. 6500', () => {
    assert.ok(regularTier)
    const { quote } = computeVentasQuotationQuote({
      employeesCount: 30,
      billingModality: 'annual',
      terminalsCount: 2,
      listCurrency: 'HNL',
      tier: regularTier,
      businessRules: rules,
      coupon: { applied: false, discountPct: 0, code: null },
    })
    assert.equal(quote.product_kind, 'basic')
    assert.equal(quote.annual_subtotal, VENTAS_BASIC_ANNUAL_PRICE)
    assert.equal(quote.annual_total, VENTAS_BASIC_ANNUAL_PRICE)
    assert.equal(quote.terminals_count, 0)
  })

  it('8 + terminals quotes the table range plus hardware', () => {
    assert.ok(microTier)
    const { quote } = computeVentasQuotationQuote({
      employeesCount: 8,
      billingModality: 'annual',
      terminalsCount: 1,
      includeTerminals: true,
      listCurrency: 'HNL',
      tier: microTier,
      businessRules: rules,
      coupon: { applied: false, discountPct: 0, code: null },
    })
    assert.equal(quote.product_kind, 'regular')
    assert.equal(quote.annual_subtotal, Number(microTier.price))
    assert.equal(quote.terminals_count, 1)
    assert.ok((quote.hardware_sale_total || 0) > 0 || (quote.terminals_included_count || 0) >= 1)
  })

  it('membership is 10% of range-with-terminals, not stacked L. 6500', () => {
    assert.ok(regularTier)
    const { quote } = computeVentasQuotationQuote({
      employeesCount: 30,
      billingModality: 'annual',
      terminalsCount: 1,
      includeTerminals: true,
      affiliateMembership: true,
      listCurrency: 'HNL',
      tier: regularTier,
      businessRules: rules,
      coupon: { applied: false, discountPct: 0, code: null },
    })
    assert.equal(quote.membership_applied, true)
    assert.equal(quote.membership_discount_pct, VENTAS_MEMBERSHIP_DISCOUNT_PCT)
    const expected = Math.round(Number(regularTier.price) * VENTAS_MEMBERSHIP_DISCOUNT_PCT * 100) / 100
    assert.equal(quote.membership_discount_amount, expected)
    assert.equal(quote.annual_total, Math.round((Number(regularTier.price) - expected) * 100) / 100)
  })

  it('Enterprise add-on is after software discount and not 10%-ed', () => {
    assert.ok(regularTier)
    const enterprisePrice = 12000
    const { quote } = computeVentasQuotationQuote({
      employeesCount: 30,
      billingModality: 'annual',
      terminalsCount: 1,
      includeTerminals: true,
      affiliateMembership: true,
      includeEnterprise: true,
      enterpriseAnnualPrice: enterprisePrice,
      listCurrency: 'HNL',
      tier: regularTier,
      businessRules: rules,
      coupon: { applied: false, discountPct: 0, code: null },
    })
    const softwareAfter = Math.round(Number(regularTier.price) * (1 - VENTAS_MEMBERSHIP_DISCOUNT_PCT) * 100) / 100
    assert.equal(quote.include_enterprise, true)
    assert.equal(quote.enterprise_annual_price, enterprisePrice)
    assert.equal(quote.annual_total, Math.round((softwareAfter + enterprisePrice) * 100) / 100)
    assert.equal(quote.commercial_plan_type, 'enterprise')
  })
})

describe('ventas form product gates', () => {
  const base = {
    contact_email: 'test@empresa.com',
    company_name: 'Acme',
    employees_count: 8,
    terminals_count: 0,
    country_code: 'HND' as const,
  }

  it('basic scope does not require terminals', () => {
    assert.equal(hasValidationErrors(ventasScopeErrors(base)), false)
  })

  it('include_terminals requires terminals', () => {
    const e = ventasScopeErrors({ ...base, include_terminals: true, terminals_count: 0 })
    assert.equal(hasValidationErrors(e), true)
    assert.ok(e.terminals_count)
  })
})

describe('planTypeFromQuoteFlags', () => {
  it('reads commercial_plan_type first', () => {
    assert.equal(
      planTypeFromQuoteFlags({
        commercialPlanType: 'enterprise',
        includeTerminals: false,
      }),
      'enterprise'
    )
  })

  it('maps terminals to premium and no terminals to basic', () => {
    assert.equal(planTypeFromQuoteFlags({ includeTerminals: true }), 'premium')
    assert.equal(planTypeFromQuoteFlags({ productKind: 'basic' }), 'basic')
  })

  it('Enterprise wins over terminals', () => {
    assert.equal(
      planTypeFromQuoteFlags({ includeTerminals: true, includeEnterprise: true }),
      'enterprise'
    )
  })
})
