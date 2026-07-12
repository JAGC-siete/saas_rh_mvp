import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  VENTAS_ANNUAL_TERMINALS_INCLUDED_MIN_EMPLOYEES,
  VENTAS_MONTHLY_MIN_EMPLOYEES,
  annualIncludesBiometricTerminals,
  isMonthlyModalityAvailable,
  quoteIncludesBiometricTerminals,
  shouldChargeHardwareContinuity,
  ventasMonthlyUnavailableMessage,
} from '../lib/ventas/business-rules'

describe('ventas business rules', () => {
  it('monthly gate: 20 no, 21 sí', () => {
    assert.equal(isMonthlyModalityAvailable(20), false)
    assert.equal(isMonthlyModalityAvailable(21), true)
    assert.equal(isMonthlyModalityAvailable(50), true)
    assert.equal(VENTAS_MONTHLY_MIN_EMPLOYEES, 21)
  })

  it('annual terminals included: 70 no, 71 sí', () => {
    assert.equal(annualIncludesBiometricTerminals(70), false)
    assert.equal(annualIncludesBiometricTerminals(71), true)
    assert.equal(annualIncludesBiometricTerminals(90), true)
    assert.equal(VENTAS_ANNUAL_TERMINALS_INCLUDED_MIN_EMPLOYEES, 71)
  })

  it('shouldChargeHardwareContinuity matrix', () => {
    assert.equal(shouldChargeHardwareContinuity('monthly', 15), true)
    assert.equal(shouldChargeHardwareContinuity('monthly', 100), true)
    assert.equal(shouldChargeHardwareContinuity('annual', 70), true)
    assert.equal(shouldChargeHardwareContinuity('annual', 71), false)
  })

  it('quoteIncludesBiometricTerminals solo annual ≥71', () => {
    assert.equal(quoteIncludesBiometricTerminals('annual', 70), false)
    assert.equal(quoteIncludesBiometricTerminals('annual', 71), true)
    assert.equal(quoteIncludesBiometricTerminals('monthly', 100), false)
  })

  it('mensaje de mensual no disponible menciona umbral', () => {
    assert.match(ventasMonthlyUnavailableMessage(), new RegExp(String(VENTAS_MONTHLY_MIN_EMPLOYEES)))
  })
})
