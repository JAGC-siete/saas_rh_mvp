import { roundMoney } from './pricing'

export type VentasBillingModality = 'annual' | 'monthly'

/** Cómo se cotiza la terminal biométrica. */
export type VentasHardwareMode = 'included' | 'sale' | 'continuity'

/** Modalidad mensual disponible desde este número de empleados (inclusive). */
export const VENTAS_MONTHLY_MIN_EMPLOYEES = 21

/**
 * En plan anual, las terminales biométricas se incluyen desde este número
 * de empleados (inclusive). Por debajo se venden one-shot.
 */
export const VENTAS_ANNUAL_TERMINALS_INCLUDED_MIN_EMPLOYEES = 51

/** Precio de lista por terminal biométrica (venta, plan anual < 51 emp). */
export const VENTAS_HARDWARE_SALE_UNIT_PRICE = 6500

export function isMonthlyModalityAvailable(employeesCount: number): boolean {
  return Number.isFinite(employeesCount) && employeesCount >= VENTAS_MONTHLY_MIN_EMPLOYEES
}

export function annualIncludesBiometricTerminals(employeesCount: number): boolean {
  return (
    Number.isFinite(employeesCount) &&
    employeesCount >= VENTAS_ANNUAL_TERMINALS_INCLUDED_MIN_EMPLOYEES
  )
}

/**
 * - monthly → Continuidad HW (todos los rangos permitidos)
 * - annual ≥ 51 → incluidas
 * - annual < 51 → venta one-shot
 */
export function resolveHardwareMode(
  modality: VentasBillingModality,
  employeesCount: number
): VentasHardwareMode {
  if (modality === 'monthly') return 'continuity'
  if (annualIncludesBiometricTerminals(employeesCount)) return 'included'
  return 'sale'
}

/** True cuando la cotización debe sumar Continuidad de Hardware (mensual). */
export function shouldChargeHardwareContinuity(
  modality: VentasBillingModality,
  employeesCount: number
): boolean {
  return resolveHardwareMode(modality, employeesCount) === 'continuity'
}

/** True cuando la cotización debe sumar venta one-shot de terminales. */
export function shouldChargeHardwareSale(
  modality: VentasBillingModality,
  employeesCount: number
): boolean {
  return resolveHardwareMode(modality, employeesCount) === 'sale'
}

/** True cuando las terminales se presentan como incluidas (sin cargo). */
export function quoteIncludesBiometricTerminals(
  modality: VentasBillingModality,
  employeesCount: number
): boolean {
  return resolveHardwareMode(modality, employeesCount) === 'included'
}

/**
 * Descuento volumen sobre venta de terminales (plan anual).
 * 2 → 5%, 3 → 10%, 4 → 15%, 5+ → 20%.
 */
export function hardwareSaleVolumeDiscountPct(terminalsCount: number): number {
  const n = Math.floor(Number(terminalsCount) || 0)
  if (n >= 5) return 0.2
  if (n === 4) return 0.15
  if (n === 3) return 0.1
  if (n === 2) return 0.05
  return 0
}

export function hardwareSaleTotal(terminalsCount: number): {
  listTotal: number
  discountPct: number
  discountAmount: number
  total: number
  unitPrice: number
} {
  const n = Math.max(0, Math.floor(Number(terminalsCount) || 0))
  const unitPrice = VENTAS_HARDWARE_SALE_UNIT_PRICE
  const listTotal = roundMoney(unitPrice * n)
  const discountPct = hardwareSaleVolumeDiscountPct(n)
  const discountAmount = roundMoney(listTotal * discountPct)
  const total = roundMoney(listTotal - discountAmount)
  return { listTotal, discountPct, discountAmount, total, unitPrice }
}

export function ventasMonthlyUnavailableMessage(): string {
  return `La modalidad mensual está disponible a partir de ${VENTAS_MONTHLY_MIN_EMPLOYEES} empleados.`
}
