import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { calcularLiquidacionHonduras } from '../lib/payroll/cesantias'
import { CesantiasRequestInput } from '../lib/payroll/cesantias-schema'

const buildInput = (overrides: Partial<CesantiasRequestInput>): CesantiasRequestInput => ({
  empleadoId: undefined,
  datosManuales: {
    salarioBaseMensual: 35000,
    fechaIngreso: '2024-07-01',
    fechaEgreso: '2025-10-31',
    ...(overrides.datosManuales || {})
  },
  parametrosCalculo: {
    motivoSalida: 'RENUNCIA',
    montoRapAcumulado: 0,
    preavisoGozado: false,
    ...(overrides.parametrosCalculo || {})
  }
})

describe('Cálculo de cesantías Honduras', () => {
  it('calcula correctamente bases salariales para salario conocido', () => {
    const input = buildInput({})
    const result = calcularLiquidacionHonduras(input)

    assert.equal(result.bases.salarioBaseMensual, 35000)
    // Base diaria: 35000 / 30 = 1166.666...
    assert.ok(Math.abs(result.bases.salarioBaseDiario - 1166.67) < 0.01)
    // Promedio mensual (fallback proxy): 35000 * 14 / 12 = 40833.33...
    assert.ok(Math.abs(result.bases.salarioPromedioMensual - 40833.33) < 0.01)
    // Promedio diario: promedio mensual / 30
    assert.ok(Math.abs(result.bases.salarioPromedioDiario - 1361.11) < 0.01)
    assert.equal(result.metadata.salaryAverageMode, 'proxy_14_12')
  })

  it('usa promedio real por últimos 6 meses y agrega 50% 13/14 (Art. 123)', () => {
    const input = buildInput({
      datosManuales: {
        salarioBaseMensual: 35000,
        salariosUltimos6Meses: [30000, 30000, 30000, 30000, 30000, 30000]
      } as any
    })
    const result = calcularLiquidacionHonduras(input)

    // avg6 = 30000, + (base/12) por 50%13 + 50%14
    assert.ok(Math.abs(result.bases.salarioPromedioMensual - 32916.67) < 0.01)
    assert.equal(result.metadata.salaryAverageMode, 'real_6m')
  })

  it('respeta salarioPromedioMensual manual cuando se provee', () => {
    const input = buildInput({
      datosManuales: {
        salarioPromedioMensual: 50000
      } as any
    })
    const result = calcularLiquidacionHonduras(input)

    assert.ok(Math.abs(result.bases.salarioPromedioMensual - 50000) < 0.01)
    assert.equal(result.metadata.salaryAverageMode, 'manual_avg')
  })

  it('calcula antigüedad comercial (360 días) consistente', () => {
    const input = buildInput({})
    const result = calcularLiquidacionHonduras(input)

    // 1 año 4 meses exactos en año comercial
    assert.equal(result.tiempos.anos, 1)
    assert.equal(result.tiempos.meses, 4)
    assert.equal(result.tiempos.dias, 0)
    assert.equal(result.tiempos.totalDias, 1 * 360 + 4 * 30)
  })

  it('no paga preaviso ni cesantía en renuncia, pero sí derechos adquiridos', () => {
    const input = buildInput({
      parametrosCalculo: {
        motivoSalida: 'RENUNCIA'
      } as any
    })
    const result = calcularLiquidacionHonduras(input)

    assert.ok(Math.abs(result.rubros.preaviso - 0) < 0.01)
    assert.ok(Math.abs(result.rubros.cesantiaBruta - 0) < 0.01)
    assert.ok(Math.abs(result.rubros.cesantiaNeta - 0) < 0.01)
    // Derechos adquiridos deben ser mayores que cero
    assert.ok(result.rubros.vacaciones + result.rubros.aguinaldo + result.rubros.decimoCuarto > 0)
  })

  it('calcula preaviso y cesantía completa en despido injustificado', () => {
    const input: CesantiasRequestInput = {
      ...buildInput({}),
      parametrosCalculo: {
        motivoSalida: 'DESPIDO_INJUSTIFICADO',
        montoRapAcumulado: 0,
        preavisoGozado: false
      }
    }

    const result = calcularLiquidacionHonduras(input)

    assert.ok(result.rubros.preaviso > 0)
    assert.ok(result.rubros.cesantiaBruta > 0)
    assert.ok(Math.abs(result.rubros.cesantiaNeta - result.rubros.cesantiaBruta) < 0.01)
    assert.ok(
      result.rubros.totalPagar >
      result.rubros.vacaciones + result.rubros.aguinaldo + result.rubros.decimoCuarto
    )
  })

  it('aplica tramos Art. 120 (<3m=0, 3-6m=10 días, 6-12m=20 días) en despido injustificado', () => {
    const salarioBaseMensual = 30000
    const salarioPromedioMensualProxy = salarioBaseMensual * 14 / 12
    const diario = salarioPromedioMensualProxy / 30

    const less3m = calcularLiquidacionHonduras(buildInput({
      datosManuales: { salarioBaseMensual, fechaIngreso: '2025-01-01', fechaEgreso: '2025-03-15' },
      parametrosCalculo: { motivoSalida: 'DESPIDO_INJUSTIFICADO' }
    } as any))
    assert.ok(less3m.tiempos.totalDias < 90)
    assert.ok(Math.abs(less3m.rubros.cesantiaBruta - 0) < 0.01)

    const between3and6 = calcularLiquidacionHonduras(buildInput({
      datosManuales: { salarioBaseMensual, fechaIngreso: '2025-01-01', fechaEgreso: '2025-04-15' },
      parametrosCalculo: { motivoSalida: 'DESPIDO_INJUSTIFICADO' }
    } as any))
    assert.ok(between3and6.tiempos.totalDias >= 90)
    assert.ok(between3and6.tiempos.totalDias < 180)
    assert.ok(Math.abs(between3and6.rubros.cesantiaBruta - diario * 10) < 0.01)

    const between6and12 = calcularLiquidacionHonduras(buildInput({
      datosManuales: { salarioBaseMensual, fechaIngreso: '2025-01-01', fechaEgreso: '2025-08-15' },
      parametrosCalculo: { motivoSalida: 'DESPIDO_INJUSTIFICADO' }
    } as any))
    assert.ok(between6and12.tiempos.totalDias >= 180)
    assert.ok(between6and12.tiempos.totalDias < 360)
    assert.ok(Math.abs(between6and12.rubros.cesantiaBruta - diario * 20) < 0.01)
  })

  it('renuncia con >=15 años y retiroVoluntario paga 35% de cesantía', () => {
    const input = buildInput({
      datosManuales: { fechaIngreso: '2005-01-01', fechaEgreso: '2025-01-01' },
      parametrosCalculo: {
        motivoSalida: 'RENUNCIA',
        condiciones: { retiroVoluntario: true }
      }
    } as any)
    const result = calcularLiquidacionHonduras(input)
    assert.ok(result.tiempos.totalDias >= 15 * 360)
    // Debe ser > 0 y menor que cesantía completa del mismo tiempo.
    assert.ok(result.rubros.cesantiaBruta > 0)
  })

  it('fallecimiento natural después de 6 meses paga 75% de cesantía', () => {
    const full = calcularLiquidacionHonduras(buildInput({
      datosManuales: { fechaIngreso: '2024-01-01', fechaEgreso: '2025-01-01' },
      parametrosCalculo: { motivoSalida: 'DESPIDO_INJUSTIFICADO' }
    } as any))

    const falle = calcularLiquidacionHonduras(buildInput({
      datosManuales: { fechaIngreso: '2024-01-01', fechaEgreso: '2025-01-01' },
      parametrosCalculo: { motivoSalida: 'FALLECIMIENTO', condiciones: { fallecimientoNatural: true } }
    } as any))

    assert.ok(falle.tiempos.totalDias >= 180)
    assert.ok(Math.abs(falle.rubros.cesantiaBruta - full.rubros.cesantiaBruta * 0.75) < 0.01)
  })

  it('aplica correctamente compensación RAP a la cesantía', () => {
    const input: CesantiasRequestInput = {
      ...buildInput({}),
      parametrosCalculo: {
        motivoSalida: 'DESPIDO_INJUSTIFICADO',
        montoRapAcumulado: 20000,
        preavisoGozado: false
      }
    }

    const result = calcularLiquidacionHonduras(input)

    assert.ok(result.rubros.cesantiaBruta > 0)
    assert.ok(result.rubros.rapAplicado > 0)
    assert.ok(result.rubros.rapAplicado <= result.rubros.cesantiaBruta)
    assert.ok(Math.abs(result.rubros.cesantiaNeta - (result.rubros.cesantiaBruta - result.rubros.rapAplicado)) < 0.01)
  })
})

