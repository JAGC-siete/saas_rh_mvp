import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  VENTAS_ANNUAL_TERMINALS_INCLUDED_MIN_EMPLOYEES,
  VENTAS_HARDWARE_SALE_UNIT_PRICE,
  VENTAS_MONTHLY_MIN_EMPLOYEES,
  annualIncludesBiometricTerminals,
  hardwareSaleTotal,
  hardwareSaleVolumeDiscountPct,
  isMonthlyModalityAvailable,
  quoteIncludesBiometricTerminals,
  resolveHardwareMode,
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
})
