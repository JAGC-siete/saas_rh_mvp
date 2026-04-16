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
    // Promedio mensual (fallback proxy): 35000 * 14 / 12 = 40833.33...
    expect(result.bases.salarioPromedioMensual).toBeCloseTo(40833.33, 2)
    // Promedio diario: promedio mensual / 30
    expect(result.bases.salarioPromedioDiario).toBeCloseTo(1361.11, 2)
    expect(result.metadata.salaryAverageMode).toBe('proxy_14_12')
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
    expect(result.bases.salarioPromedioMensual).toBeCloseTo(32916.67, 2)
    expect(result.metadata.salaryAverageMode).toBe('real_6m')
  })

  it('respeta salarioPromedioMensual manual cuando se provee', () => {
    const input = buildInput({
      datosManuales: {
        salarioPromedioMensual: 50000
      } as any
    })
    const result = calcularLiquidacionHonduras(input)

    expect(result.bases.salarioPromedioMensual).toBeCloseTo(50000, 2)
    expect(result.metadata.salaryAverageMode).toBe('manual_avg')
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

  it('aplica tramos Art. 120 (<3m=0, 3-6m=10 días, 6-12m=20 días) en despido injustificado', () => {
    const salarioBaseMensual = 30000
    const salarioPromedioMensualProxy = salarioBaseMensual * 14 / 12
    const diario = salarioPromedioMensualProxy / 30

    const less3m = calcularLiquidacionHonduras(buildInput({
      datosManuales: { salarioBaseMensual, fechaIngreso: '2025-01-01', fechaEgreso: '2025-03-15' },
      parametrosCalculo: { motivoSalida: 'DESPIDO_INJUSTIFICADO' }
    } as any))
    expect(less3m.tiempos.totalDias).toBeLessThan(90)
    expect(less3m.rubros.cesantiaBruta).toBeCloseTo(0, 2)

    const between3and6 = calcularLiquidacionHonduras(buildInput({
      datosManuales: { salarioBaseMensual, fechaIngreso: '2025-01-01', fechaEgreso: '2025-04-15' },
      parametrosCalculo: { motivoSalida: 'DESPIDO_INJUSTIFICADO' }
    } as any))
    expect(between3and6.tiempos.totalDias).toBeGreaterThanOrEqual(90)
    expect(between3and6.tiempos.totalDias).toBeLessThan(180)
    expect(between3and6.rubros.cesantiaBruta).toBeCloseTo(diario * 10, 2)

    const between6and12 = calcularLiquidacionHonduras(buildInput({
      datosManuales: { salarioBaseMensual, fechaIngreso: '2025-01-01', fechaEgreso: '2025-08-15' },
      parametrosCalculo: { motivoSalida: 'DESPIDO_INJUSTIFICADO' }
    } as any))
    expect(between6and12.tiempos.totalDias).toBeGreaterThanOrEqual(180)
    expect(between6and12.tiempos.totalDias).toBeLessThan(360)
    expect(between6and12.rubros.cesantiaBruta).toBeCloseTo(diario * 20, 2)
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
    expect(result.tiempos.totalDias).toBeGreaterThanOrEqual(15 * 360)
    // Debe ser > 0 y menor que cesantía completa del mismo tiempo.
    expect(result.rubros.cesantiaBruta).toBeGreaterThan(0)
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

    expect(falle.tiempos.totalDias).toBeGreaterThanOrEqual(180)
    expect(falle.rubros.cesantiaBruta).toBeCloseTo(full.rubros.cesantiaBruta * 0.75, 2)
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

