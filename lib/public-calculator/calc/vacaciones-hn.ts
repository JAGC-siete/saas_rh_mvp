import Decimal from 'decimal.js'
import {
  vacationDaysForCompletedYears,
  vacationProportionalDivisor,
} from '../../payroll/cesantias'
import {
  DIAS_ANO_COMERCIAL,
  DIAS_MES_COMERCIAL,
  diffDays360,
  parseDateYmd,
} from '../../payroll/thirteenth-fourteenth/calendar'

/**
 * Vacaciones Honduras para la calculadora pública.
 * - Días del último año completo: escala Art. 346 CT (10 / 12 / 15 / 20 días).
 * - Año en curso (incompleto): días acumulados ÷ divisor de la guía STSS (36 / 30 / 24 / 18).
 * - Valor: días × salario diario (mensual ÷ 30). Misma base que la liquidación en lib/payroll/cesantias.ts.
 */
export interface VacacionesHnInput {
  salarioMensual: number
  fechaIngreso: string
  fechaCalculo: string
}

export interface VacacionesHnResult {
  diasLaborados: number
  anosCompletos: number
  salarioDiario: number
  /** Días que da el último año completo (0 si aún no cumple un año). */
  diasUltimoAno: number
  valorUltimoAno: number
  /** Días acumulados en el año en curso, a 2 decimales. */
  diasProporcionales: number
  valorProporcional: number
  /** Días que le tocarán al completar el año en curso. */
  diasProximoAno: number
}

export function calculateVacacionesHn(input: VacacionesHnInput): VacacionesHnResult {
  const salario = new Decimal(Math.max(0, Number(input.salarioMensual) || 0))
  const diasLaborados = diffDays360(parseDateYmd(input.fechaIngreso), parseDateYmd(input.fechaCalculo))
  const anosCompletos = Math.floor(diasLaborados / DIAS_ANO_COMERCIAL)
  const diasFraccion = diasLaborados % DIAS_ANO_COMERCIAL

  const salarioDiario = salario.div(DIAS_MES_COMERCIAL)
  const diasUltimoAno = vacationDaysForCompletedYears(anosCompletos)
  const diasProporcionales = new Decimal(diasFraccion).div(vacationProportionalDivisor(anosCompletos))

  return {
    diasLaborados,
    anosCompletos,
    salarioDiario: salarioDiario.toDecimalPlaces(2).toNumber(),
    diasUltimoAno,
    valorUltimoAno: salarioDiario.mul(diasUltimoAno).toDecimalPlaces(2).toNumber(),
    diasProporcionales: diasProporcionales.toDecimalPlaces(2).toNumber(),
    valorProporcional: salarioDiario.mul(diasProporcionales).toDecimalPlaces(2).toNumber(),
    diasProximoAno: vacationDaysForCompletedYears(anosCompletos + 1),
  }
}
