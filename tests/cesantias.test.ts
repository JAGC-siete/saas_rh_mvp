import { describe, it, expect } from '@jest/globals'
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

    expect(result.bases.salarioBaseMensual).toBe(35000)
    // Base diaria: 35000 / 30 = 1166.666...
    expect(result.bases.salarioBaseDiario).toBeCloseTo(1166.67, 2)
    // Promedio mensual: 35000 * 14 / 12 = 40833.33...
    expect(result.bases.salarioPromedioMensual).toBeCloseTo(40833.33, 2)
    // Promedio diario: promedio mensual / 30
    expect(result.bases.salarioPromedioDiario).toBeCloseTo(1361.11, 2)
  })

  it('calcula antigüedad comercial (360 días) consistente', () => {
    const input = buildInput({})
    const result = calcularLiquidacionHonduras(input)

    // 1 año 4 meses exactos en año comercial
    expect(result.tiempos.anos).toBe(1)
    expect(result.tiempos.meses).toBe(4)
    expect(result.tiempos.dias).toBe(0)
    expect(result.tiempos.totalDias).toBe(1 * 360 + 4 * 30)
  })

  it('no paga preaviso ni cesantía en renuncia, pero sí derechos adquiridos', () => {
    const input = buildInput({
      parametrosCalculo: {
        motivoSalida: 'RENUNCIA'
      } as any
    })
    const result = calcularLiquidacionHonduras(input)

    expect(result.rubros.preaviso).toBeCloseTo(0, 2)
    expect(result.rubros.cesantiaBruta).toBeCloseTo(0, 2)
    expect(result.rubros.cesantiaNeta).toBeCloseTo(0, 2)
    // Derechos adquiridos deben ser mayores que cero
    expect(result.rubros.vacaciones + result.rubros.aguinaldo + result.rubros.decimoCuarto).toBeGreaterThan(0)
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

    expect(result.rubros.preaviso).toBeGreaterThan(0)
    expect(result.rubros.cesantiaBruta).toBeGreaterThan(0)
    expect(result.rubros.cesantiaNeta).toBeCloseTo(result.rubros.cesantiaBruta, 2)
    expect(result.rubros.totalPagar).toBeGreaterThan(
      result.rubros.vacaciones + result.rubros.aguinaldo + result.rubros.decimoCuarto
    )
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

    expect(result.rubros.cesantiaBruta).toBeGreaterThan(0)
    expect(result.rubros.rapAplicado).toBeGreaterThan(0)
    expect(result.rubros.rapAplicado).toBeLessThanOrEqual(result.rubros.cesantiaBruta)
    expect(result.rubros.cesantiaNeta).toBeCloseTo(
      result.rubros.cesantiaBruta - result.rubros.rapAplicado,
      2
    )
  })
})

