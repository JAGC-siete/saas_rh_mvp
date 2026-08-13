import type { PublicCalculatorConfig } from './config'

export type DigitalHealthInsights = {
  timeLeakHoursPerMonth: number
  constanciaCaveman: string
  constanciaPro: string
}

/** Escala horas perdidas por salario mensual (marketing, no legal). */
export function estimateTimeLeakHours(monthlyGrossSalary: number, baseHours: number): number {
  if (monthlyGrossSalary >= 40000) return Math.max(baseHours, 25)
  if (monthlyGrossSalary >= 20000) return Math.max(baseHours, 20)
  return baseHours
}

export function buildDigitalHealthInsights(
  config: NonNullable<PublicCalculatorConfig['b2bFunnel']>,
  monthlyGrossSalary: number
): DigitalHealthInsights {
  const hours = estimateTimeLeakHours(monthlyGrossSalary, config.digitalHealth.timeLeakHoursPerMonth)
  return {
    timeLeakHoursPerMonth: hours,
    constanciaCaveman: config.digitalHealth.constanciaDaysCaveman,
    constanciaPro: `${config.digitalHealth.constanciaSecondsPro} segundos`,
  }
}
