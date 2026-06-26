import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  calculateBenefit,
  calculateProportional13,
  calculateProportional14,
  MIN_DAYS_14AVO_ANNUAL,
} from '../lib/payroll/thirteenth-fourteenth/calculate'
import { resolvePeriod13, resolvePeriod14 } from '../lib/payroll/thirteenth-fourteenth/calendar'
import { calcularLiquidacionHonduras } from '../lib/payroll/cesantias'

describe('thirteenth-fourteenth calendar', () => {
  it('13vo: cuenta días desde 1 ene del año de cálculo', () => {
    const ingreso = new Date(2024, 5, 1)
    const calculo = new Date(2025, 4, 15)
    const p = resolvePeriod13(ingreso, calculo)
    assert.equal(p.diasEnPeriodo, 135)
  })

  it('14vo: período jul–jun con ingreso mid-year', () => {
    const ingreso = new Date(2025, 0, 15)
    const calculo = new Date(2025, 4, 15)
    const p = resolvePeriod14(ingreso, calculo)
    assert.ok(p.diasEnPeriodo > 0)
    assert.ok(p.diasEnPeriodo < 360)
  })

  it('14vo: renuncia en mayo acumula días desde julio anterior', () => {
    const ingreso = new Date(2020, 0, 1)
    const calculo = new Date(2025, 4, 15)
    const p = resolvePeriod14(ingreso, calculo)
    assert.equal(p.diasEnPeriodo, 315)
  })
})

describe('thirteenth-fourteenth formulas', () => {
  it('aguinaldo: (salario/360)*días', () => {
    const monto = calculateProportional13(36000, 180)
    assert.equal(monto, 18000)
  })

  it('catorceavo: (salario/360)*días', () => {
    const monto = calculateProportional14(36000, 90)
    assert.equal(monto, 9000)
  })

  it('modo anual usa salario promedio', () => {
    const result = calculateBenefit({
      tipo: '13AVO',
      salarioBaseMensual: 30000,
      salarioPromedioMensual: 35000,
      fechaIngreso: '2025-01-01',
      fechaCalculo: '2025-06-30',
      modoCalculo: 'anual',
    })
    assert.equal(result.salarioUsado, 35000)
    assert.ok(result.monto > 0)
  })

  it('14vo: marca elegibilidad anual con 200 días', () => {
    const eligible = calculateBenefit({
      tipo: '14AVO',
      salarioBaseMensual: 25000,
      fechaIngreso: '2024-01-01',
      fechaCalculo: '2025-06-01',
      modoCalculo: 'proporcional',
    })
    assert.equal(eligible.elegible14voAnual, true)

    const notEligible = calculateBenefit({
      tipo: '14AVO',
      salarioBaseMensual: 25000,
      fechaIngreso: '2025-04-01',
      fechaCalculo: '2025-06-01',
      modoCalculo: 'proporcional',
    })
    assert.equal(notEligible.elegible14voAnual, false)
    assert.ok(notEligible.diasEnPeriodo < MIN_DAYS_14AVO_ANNUAL)
  })
})

describe('parity with cesantias liquidation', () => {
  it('aguinaldo y 14vo coinciden con finiquito renuncia', () => {
    const liq = calcularLiquidacionHonduras({
      datosManuales: {
        salarioBaseMensual: 35000,
        fechaIngreso: '2024-07-01',
        fechaEgreso: '2025-10-31',
      },
      parametrosCalculo: { motivoSalida: 'RENUNCIA' },
    })

    const aguinaldo = calculateBenefit({
      tipo: '13AVO',
      salarioBaseMensual: 35000,
      fechaIngreso: '2024-07-01',
      fechaCalculo: '2025-10-31',
      modoCalculo: 'proporcional',
    })
    const catorceavo = calculateBenefit({
      tipo: '14AVO',
      salarioBaseMensual: 35000,
      fechaIngreso: '2024-07-01',
      fechaCalculo: '2025-10-31',
      modoCalculo: 'proporcional',
    })

    assert.equal(aguinaldo.monto, liq.rubros.aguinaldo)
    assert.equal(catorceavo.monto, liq.rubros.decimoCuarto)
  })
})
