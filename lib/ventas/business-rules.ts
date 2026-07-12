export type VentasBillingModality = 'annual' | 'monthly'

/** Modalidad mensual disponible desde este número de empleados (inclusive). */
export const VENTAS_MONTHLY_MIN_EMPLOYEES = 21

/**
 * En plan anual, las terminales biométricas se incluyen desde este número
 * de empleados (inclusive). Por debajo se cotizan como Continuidad de Hardware.
 */
export const VENTAS_ANNUAL_TERMINALS_INCLUDED_MIN_EMPLOYEES = 71

export function isMonthlyModalityAvailable(employeesCount: number): boolean {
  return Number.isFinite(employeesCount) && employeesCount >= VENTAS_MONTHLY_MIN_EMPLOYEES
}

export function annualIncludesBiometricTerminals(employeesCount: number): boolean {
  return (
    Number.isFinite(employeesCount) &&
    employeesCount >= VENTAS_ANNUAL_TERMINALS_INCLUDED_MIN_EMPLOYEES
  )
}

/** True cuando la cotización debe sumar Servicio de Continuidad de Hardware. */
export function shouldChargeHardwareContinuity(
  modality: VentasBillingModality,
  employeesCount: number
): boolean {
  if (modality === 'monthly') return true
  return !annualIncludesBiometricTerminals(employeesCount)
}

/** True cuando las terminales se presentan como incluidas (sin fee de continuidad). */
export function quoteIncludesBiometricTerminals(
  modality: VentasBillingModality,
  employeesCount: number
): boolean {
  return modality === 'annual' && annualIncludesBiometricTerminals(employeesCount)
}

export function ventasMonthlyUnavailableMessage(): string {
  return `La modalidad mensual está disponible a partir de ${VENTAS_MONTHLY_MIN_EMPLOYEES} empleados.`
}
