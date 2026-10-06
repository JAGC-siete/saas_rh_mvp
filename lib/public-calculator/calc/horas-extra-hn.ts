import Decimal from 'decimal.js'
import { HONDURAS_LABOR_FACTOR } from '../../payroll/constants'
import {
  OVERTIME_BAND_META,
  OVERTIME_PERCENT_GROUPS,
  calculateOvertimePayFromAhc,
  percentGroupValuesToBreakdown,
  type OvertimePercentGroupKey,
} from '../../payroll/overtime-pay'

/**
 * Horas extra Honduras para la calculadora pública: mismo motor que la planilla
 * (tarifa = mensual ÷ 240; franjas +25 / +50 / +75 / +100 % de lib/payroll/overtime-pay.ts).
 */
export type HorasExtraHnInput = {
  salarioMensual: number
  horas: Partial<Record<OvertimePercentGroupKey, number>>
}

export interface HorasExtraHnLine {
  key: OvertimePercentGroupKey
  label: string
  horas: number
  multiplicador: number
  monto: number
}

export interface HorasExtraHnResult {
  tarifaHora: number
  lineas: HorasExtraHnLine[]
  totalHoras: number
  total: number
}

const GROUP_MULTIPLIER: Record<OvertimePercentGroupKey, number> = {
  pct_25: OVERTIME_BAND_META.find((b) => b.key === 'evening_25')!.multiplier,
  night_50: OVERTIME_BAND_META.find((b) => b.key === 'night_50')!.multiplier,
  late_75: OVERTIME_BAND_META.find((b) => b.key === 'late_75')!.multiplier,
  holiday_100: OVERTIME_BAND_META.find((b) => b.key === 'holiday_100')!.multiplier,
}

export function calculateHorasExtraHn(input: HorasExtraHnInput): HorasExtraHnResult {
  const salario = Math.max(0, Number(input.salarioMensual) || 0)
  const tarifa = new Decimal(salario).div(HONDURAS_LABOR_FACTOR)
  const horas = Object.fromEntries(
    OVERTIME_PERCENT_GROUPS.map((g) => [g.key, Math.max(0, Number(input.horas[g.key]) || 0)])
  ) as Record<OvertimePercentGroupKey, number>

  const lineas = OVERTIME_PERCENT_GROUPS.map((g) => ({
    key: g.key,
    label: g.label,
    horas: horas[g.key],
    multiplicador: GROUP_MULTIPLIER[g.key],
    monto: tarifa.mul(GROUP_MULTIPLIER[g.key]).mul(horas[g.key]).toDecimalPlaces(2).toNumber(),
  }))

  return {
    tarifaHora: tarifa.toDecimalPlaces(2).toNumber(),
    lineas,
    totalHoras: lineas.reduce((a, l) => a + l.horas, 0),
    // Total con el motor de planilla (redondeo único al final, igual que en la corrida).
    total: calculateOvertimePayFromAhc(percentGroupValuesToBreakdown(horas), tarifa.toNumber()),
  }
}
