import Decimal from 'decimal.js'
import {
  DIAS_ANO_COMERCIAL,
  MIN_DAYS_14AVO_ANNUAL,
  formatDateISO,
  parseDateYmd,
  resolveBenefitPeriodDays,
} from './calendar'
import type { BenefitCalculateRequest } from './schema'

export { DIAS_MES_COMERCIAL, DIAS_ANO_COMERCIAL, MIN_DAYS_14AVO_ANNUAL } from './calendar'
export { diffDays360, parseDateYmd, resolvePeriod13, resolvePeriod14 } from './calendar'

export interface BenefitCalculationResult {
  tipo: '13AVO' | '14AVO'
  monto: number
  diasEnPeriodo: number
  salarioUsado: number
  salarioBaseMensual: number
  modoCalculo: 'proporcional' | 'anual'
  periodo: { inicio: string; fin: string }
  elegible14voAnual: boolean | null
  disclaimerSinDeducciones: true
  desglose: {
    formula: string
    divisor: number
    diasEnPeriodo: number
    salarioMensual: number
  }
}

export function calculateProportional13(salarioMensual: number, diasEnPeriodo: number): number {
  if (diasEnPeriodo <= 0) return 0
  return new Decimal(salarioMensual)
    .div(DIAS_ANO_COMERCIAL)
    .mul(diasEnPeriodo)
    .toDecimalPlaces(2)
    .toNumber()
}

export function calculateProportional14(salarioMensual: number, diasEnPeriodo: number): number {
  if (diasEnPeriodo <= 0) return 0
  return new Decimal(salarioMensual)
    .div(DIAS_ANO_COMERCIAL)
    .mul(diasEnPeriodo)
    .toDecimalPlaces(2)
    .toNumber()
}

export function calculateBenefit(input: BenefitCalculateRequest): BenefitCalculationResult {
  const ingreso = parseDateYmd(input.fechaIngreso)
  const calculo = parseDateYmd(input.fechaCalculo)
  const modoCalculo = input.modoCalculo ?? 'proporcional'

  const period = resolveBenefitPeriodDays(
    input.tipo,
    ingreso,
    calculo,
    input.diasTrabajadosPeriodo
  )

  const salarioUsado =
    modoCalculo === 'anual' && input.salarioPromedioMensual != null
      ? input.salarioPromedioMensual
      : input.salarioBaseMensual

  const calcFn = input.tipo === '13AVO' ? calculateProportional13 : calculateProportional14
  const monto = calcFn(salarioUsado, period.diasEnPeriodo)

  const elegible14voAnual =
    input.tipo === '14AVO'
      ? period.diasEnPeriodo >= MIN_DAYS_14AVO_ANNUAL
      : null

  const label = input.tipo === '13AVO' ? 'Aguinaldo (13vo)' : 'Catorceavo (14vo)'

  return {
    tipo: input.tipo,
    monto,
    diasEnPeriodo: period.diasEnPeriodo,
    salarioUsado,
    salarioBaseMensual: input.salarioBaseMensual,
    modoCalculo,
    periodo: {
      inicio: formatDateISO(period.inicio),
      fin: formatDateISO(period.fin),
    },
    elegible14voAnual,
    disclaimerSinDeducciones: true,
    desglose: {
      formula: `(${label}: Salario / 360) × Días en período`,
      divisor: DIAS_ANO_COMERCIAL,
      diasEnPeriodo: period.diasEnPeriodo,
      salarioMensual: salarioUsado,
    },
  }
}

/** Used by cesantias liquidation — proportional 13vo/14vo on base salary. */
export function calculateLiquidation13vo14vo(
  salarioBaseMensual: number,
  diasAnoNatural: number,
  diasDesdeJulio: number
): { aguinaldo: number; decimoCuarto: number } {
  return {
    aguinaldo: calculateProportional13(salarioBaseMensual, diasAnoNatural),
    decimoCuarto: calculateProportional14(salarioBaseMensual, diasDesdeJulio),
  }
}
