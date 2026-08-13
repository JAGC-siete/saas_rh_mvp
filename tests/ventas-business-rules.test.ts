import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  VENTAS_ANNUAL_TERMINALS_INCLUDED_MIN_EMPLOYEES,
  VENTAS_EXTRA_TERMINALS_DISCOUNT_PCT,
  VENTAS_HARDWARE_SALE_UNIT_PRICE,
  VENTAS_MONTHLY_MIN_EMPLOYEES,
  annualIncludesBiometricTerminals,
  computeAnnualHardwareCharges,
  hardwareExtraTerminalsSaleTotal,
  hardwareSaleTotal,
  hardwareSaleVolumeDiscountPct,
  isMonthlyModalityAvailable,
  quoteIncludesBiometricTerminals,
  resolveFormMaxTerminals,
  resolveHardwareMode,
  resolveIncludedTerminalsCap,
  shouldChargeHardwareContinuity,
  shouldChargeHardwareSale,
  ventasMonthlyUnavailableMessage,
} from '../lib/ventas/business-rules'

describe('ventas business rules', () => {
  it('monthly gate: 20 no, 21 sí', () => {
    assert.equal(isMonthlyModalityAvailable(20), false)
    assert.equal(isMonthlyModalityAvailable(21), true)
    assert.equal(VENTAS_MONTHLY_MIN_EMPLOYEES, 21)
  })

  it('annual terminals included: 50 no, 51 sí', () => {
    assert.equal(annualIncludesBiometricTerminals(50), false)
    assert.equal(annualIncludesBiometricTerminals(51), true)
    assert.equal(VENTAS_ANNUAL_TERMINALS_INCLUDED_MIN_EMPLOYEES, 51)
  })

  it('hardware mode matrix', () => {
    assert.equal(resolveHardwareMode('monthly', 30), 'continuity')
    assert.equal(resolveHardwareMode('monthly', 100), 'continuity')
    assert.equal(resolveHardwareMode('annual', 50), 'sale')
    assert.equal(resolveHardwareMode('annual', 51), 'included')
  })

  it('shouldChargeHardwareContinuity solo monthly', () => {
    assert.equal(shouldChargeHardwareContinuity('monthly', 15), true)
    assert.equal(shouldChargeHardwareContinuity('monthly', 100), true)
    assert.equal(shouldChargeHardwareContinuity('annual', 40), false)
    assert.equal(shouldChargeHardwareContinuity('annual', 80), false)
  })

  it('shouldChargeHardwareSale solo annual <51', () => {
    assert.equal(shouldChargeHardwareSale('annual', 50), true)
    assert.equal(shouldChargeHardwareSale('annual', 51), false)
    assert.equal(shouldChargeHardwareSale('monthly', 30), false)
  })

  it('quoteIncludesBiometricTerminals solo annual ≥51', () => {
    assert.equal(quoteIncludesBiometricTerminals('annual', 50), false)
    assert.equal(quoteIncludesBiometricTerminals('annual', 51), true)
    assert.equal(quoteIncludesBiometricTerminals('monthly', 100), false)
  })

  it('hardware sale volume discounts', () => {
    assert.equal(VENTAS_HARDWARE_SALE_UNIT_PRICE, 6500)
    assert.equal(hardwareSaleVolumeDiscountPct(1), 0)
    assert.equal(hardwareSaleVolumeDiscountPct(2), 0.05)
    assert.equal(hardwareSaleVolumeDiscountPct(3), 0.1)
    assert.equal(hardwareSaleVolumeDiscountPct(4), 0.15)
    assert.equal(hardwareSaleVolumeDiscountPct(5), 0.2)
    assert.equal(hardwareSaleVolumeDiscountPct(8), 0.2)

    assert.equal(hardwareSaleTotal(1).total, 6500)
    assert.equal(hardwareSaleTotal(2).total, 12350) // 13000 * 0.95
    assert.equal(hardwareSaleTotal(3).total, 17550) // 19500 * 0.90
    assert.equal(hardwareSaleTotal(4).total, 22100) // 26000 * 0.85
    assert.equal(hardwareSaleTotal(5).total, 26000) // 32500 * 0.80
  })

  it('mensaje de mensual no disponible menciona umbral', () => {
    assert.match(ventasMonthlyUnavailableMessage(), new RegExp(String(VENTAS_MONTHLY_MIN_EMPLOYEES)))
  })

  it('tier override included/sale gana sobre umbral auto', () => {
    assert.equal(
      resolveHardwareMode('annual', 20, { tier: { annual_terminal_mode: 'included' } }),
      'included'
    )
    assert.equal(
      resolveHardwareMode('annual', 100, { tier: { annual_terminal_mode: 'sale' } }),
      'sale'
    )
    assert.equal(
      resolveHardwareMode('annual', 100, {
        rules: { annual_terminals_included_min_employees: 200 },
        tier: { annual_terminal_mode: 'auto' },
      }),
      'sale'
    )
  })

  it('hardwareSaleTotal respeta unit price de rules', () => {
    assert.equal(hardwareSaleTotal(1, { hardware_sale_unit_price: 8000 }).total, 8000)
  })

  it('form max vs included cap are independent', () => {
    const rules = { max_auto_quote_terminals: 5 }
    const tier = { annual_terminal_mode: 'included' as const, included_terminals_max: 3 }
    assert.equal(resolveFormMaxTerminals(rules), 5)
    assert.equal(resolveIncludedTerminalsCap(rules, tier), 3)
  })

  it('annual included: 4 terminals → 3 free + 1 extra at −20%', () => {
    const charges = computeAnnualHardwareCharges({
      modality: 'annual',
      employeesCount: 40,
      terminalsCount: 4,
      rules: { hardware_sale_unit_price: 7500, max_auto_quote_terminals: 5 },
      tier: { annual_terminal_mode: 'included', included_terminals_max: 3 },
    })
    assert.equal(charges.mode, 'included')
    assert.equal(charges.includedCount, 3)
    assert.equal(charges.extraCount, 1)
    assert.equal(charges.sale?.discountPct, VENTAS_EXTRA_TERMINALS_DISCOUNT_PCT)
    assert.equal(charges.sale?.total, 6000) // 7500 * 0.8
  })

  it('annual included: 5 terminals → 3 free + 2 extras at −20%', () => {
    const sale = hardwareExtraTerminalsSaleTotal(2, { hardware_sale_unit_price: 7500 })
    assert.equal(sale.listTotal, 15000)
    assert.equal(sale.total, 12000)
    const charges = computeAnnualHardwareCharges({
      modality: 'annual',
      employeesCount: 80,
      terminalsCount: 5,
      rules: { hardware_sale_unit_price: 7500, max_auto_quote_terminals: 5 },
      tier: { annual_terminal_mode: 'included', included_terminals_max: 3 },
    })
    assert.equal(charges.extraCount, 2)
    assert.equal(charges.sale?.total, 12000)
  })

  it('monthly: no hardware sale; extras N/A', () => {
    const charges = computeAnnualHardwareCharges({
      modality: 'monthly',
      employeesCount: 40,
      terminalsCount: 5,
      rules: { max_auto_quote_terminals: 5 },
      tier: { annual_terminal_mode: 'included', included_terminals_max: 3 },
    })
    assert.equal(charges.mode, 'continuity')
    assert.equal(charges.sale, null)
  })

  it('admin cascade: rules + tier overrides match screenshot config', () => {
    const rules = {
      monthly_min_employees: 101,
      annual_terminals_included_min_employees: 11,
      max_auto_quote_terminals: 5,
      hardware_sale_unit_price: 7500,
    }
    const tierSale = { annual_terminal_mode: 'sale' as const, included_terminals_max: 5 }
    const tierIncluded3 = {
      annual_terminal_mode: 'included' as const,
      included_terminals_max: 3,
    }
    const tierIncluded5 = {
      annual_terminal_mode: 'included' as const,
      included_terminals_max: 5,
    }

    assert.equal(isMonthlyModalityAvailable(100, rules), false)
    assert.equal(isMonthlyModalityAvailable(101, rules), true)
    assert.equal(resolveFormMaxTerminals(rules), 5)

    // 2–10: venta aparte — Hasta N ignored for pricing
    assert.equal(resolveHardwareMode('annual', 8, { rules, tier: tierSale }), 'sale')
    const saleCharges = computeAnnualHardwareCharges({
      modality: 'annual',
      employeesCount: 8,
      terminalsCount: 2,
      rules,
      tier: tierSale,
    })
    assert.equal(saleCharges.extraCount, 2)
    assert.equal(saleCharges.sale?.unitPrice, 7500)

    // 11–100: incluidas hasta 3; extras −20%
    assert.equal(resolveHardwareMode('annual', 40, { rules, tier: tierIncluded3 }), 'included')
    const extras = computeAnnualHardwareCharges({
      modality: 'annual',
      employeesCount: 40,
      terminalsCount: 5,
      rules,
      tier: tierIncluded3,
    })
    assert.equal(extras.includedCount, 3)
    assert.equal(extras.extraCount, 2)
    assert.equal(extras.sale?.total, 12000)

    // 301–500: incluidas hasta 5 → sin extras al elegir 5
    const full = computeAnnualHardwareCharges({
      modality: 'annual',
      employeesCount: 350,
      terminalsCount: 5,
      rules,
      tier: tierIncluded5,
    })
    assert.equal(full.includedCount, 5)
    assert.equal(full.extraCount, 0)
    assert.equal(full.sale, null)
  })
})
