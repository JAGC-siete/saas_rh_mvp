import { roundMoney } from './pricing'

export type VentasBillingModality = 'annual' | 'monthly'

/** Cómo se cotiza la terminal biométrica. */
export type VentasHardwareMode = 'included' | 'sale' | 'continuity'

/** Override por rango de precios (anual). `auto` = umbral global. */
export type VentasAnnualTerminalMode = 'auto' | 'included' | 'sale'

/** Modalidad mensual disponible desde este número de empleados (inclusive). */
export const VENTAS_MONTHLY_MIN_EMPLOYEES = 21

/**
 * En plan anual, las terminales biométricas se incluyen desde este número
 * de empleados (inclusive). Por debajo se venden one-shot.
 */
export const VENTAS_ANNUAL_TERMINALS_INCLUDED_MIN_EMPLOYEES = 51

/** Precio de lista por terminal biométrica (venta one-shot, plan anual modo sale). */
export const VENTAS_HARDWARE_SALE_UNIT_PRICE = 6500

/** Máximo de terminales en cotización automática del formulario web. */
export const VENTAS_MAX_AUTO_QUOTE_TERMINALS = 5

/** Cuota mensual de la primera terminal (base). */
export const VENTAS_HARDWARE_BASE_MONTHLY = 958.33
/** Descuento incremental por cada terminal adicional (hasta el piso). */
export const VENTAS_HARDWARE_INCREMENTAL_DISCOUNT = 95
/** Piso de cuota mensual por terminal (desde la 4.ª en adelante). */
export const VENTAS_HARDWARE_FLOOR_MONTHLY = 673.33

export type VentasHardwareContinuityRules = {
  base_monthly: number
  incremental_discount: number
  floor_monthly: number
}

export type VentasBusinessRules = {
  monthly_min_employees: number
  annual_terminals_included_min_employees: number
  max_auto_quote_terminals: number
  hardware_sale_unit_price: number
  hardware_continuity: VentasHardwareContinuityRules
}

export type VentasTierHardwareHints = {
  annual_terminal_mode?: VentasAnnualTerminalMode | null
  included_terminals_max?: number | null
}

export const DEFAULT_VENTAS_BUSINESS_RULES: VentasBusinessRules = {
  monthly_min_employees: VENTAS_MONTHLY_MIN_EMPLOYEES,
  annual_terminals_included_min_employees: VENTAS_ANNUAL_TERMINALS_INCLUDED_MIN_EMPLOYEES,
  max_auto_quote_terminals: VENTAS_MAX_AUTO_QUOTE_TERMINALS,
  hardware_sale_unit_price: VENTAS_HARDWARE_SALE_UNIT_PRICE,
  hardware_continuity: {
    base_monthly: VENTAS_HARDWARE_BASE_MONTHLY,
    incremental_discount: VENTAS_HARDWARE_INCREMENTAL_DISCOUNT,
    floor_monthly: VENTAS_HARDWARE_FLOOR_MONTHLY,
  },
}

function finiteOr(n: unknown, fallback: number): number {
  const v = typeof n === 'number' ? n : typeof n === 'string' ? Number(n) : NaN
  return Number.isFinite(v) ? v : fallback
}

export function mergeVentasBusinessRules(raw?: Partial<VentasBusinessRules> | null): VentasBusinessRules {
  const d = DEFAULT_VENTAS_BUSINESS_RULES
  const continuity = raw?.hardware_continuity
  return {
    monthly_min_employees: Math.max(
      1,
      Math.trunc(finiteOr(raw?.monthly_min_employees, d.monthly_min_employees))
    ),
    annual_terminals_included_min_employees: Math.max(
      1,
      Math.trunc(
        finiteOr(raw?.annual_terminals_included_min_employees, d.annual_terminals_included_min_employees)
      )
    ),
    max_auto_quote_terminals: Math.max(
      1,
      Math.trunc(finiteOr(raw?.max_auto_quote_terminals, d.max_auto_quote_terminals))
    ),
    hardware_sale_unit_price: Math.max(
      0,
      finiteOr(raw?.hardware_sale_unit_price, d.hardware_sale_unit_price)
    ),
    hardware_continuity: {
      base_monthly: Math.max(
        0,
        finiteOr(continuity?.base_monthly, d.hardware_continuity.base_monthly)
      ),
      incremental_discount: Math.max(
        0,
        finiteOr(continuity?.incremental_discount, d.hardware_continuity.incremental_discount)
      ),
      floor_monthly: Math.max(
        0,
        finiteOr(continuity?.floor_monthly, d.hardware_continuity.floor_monthly)
      ),
    },
  }
}

export function normalizeAnnualTerminalMode(raw: unknown): VentasAnnualTerminalMode {
  if (raw === 'included' || raw === 'sale' || raw === 'auto') return raw
  return 'auto'
}

export function isMonthlyModalityAvailable(
  employeesCount: number,
  rules?: Partial<VentasBusinessRules> | null
): boolean {
  const r = mergeVentasBusinessRules(rules)
  return Number.isFinite(employeesCount) && employeesCount >= r.monthly_min_employees
}

export function annualIncludesBiometricTerminals(
  employeesCount: number,
  rules?: Partial<VentasBusinessRules> | null
): boolean {
  const r = mergeVentasBusinessRules(rules)
  return (
    Number.isFinite(employeesCount) &&
    employeesCount >= r.annual_terminals_included_min_employees
  )
}

/**
 * - monthly → Continuidad HW (todos los rangos permitidos)
 * - annual + tier.included → incluidas
 * - annual + tier.sale → venta
 * - annual + auto / sin tier → umbral global
 */
export function resolveHardwareMode(
  modality: VentasBillingModality,
  employeesCount: number,
  options?: {
    rules?: Partial<VentasBusinessRules> | null
    tier?: VentasTierHardwareHints | null
  }
): VentasHardwareMode {
  if (modality === 'monthly') return 'continuity'

  const mode = normalizeAnnualTerminalMode(options?.tier?.annual_terminal_mode)
  if (mode === 'included') return 'included'
  if (mode === 'sale') return 'sale'

  if (annualIncludesBiometricTerminals(employeesCount, options?.rules)) return 'included'
  return 'sale'
}

/** True cuando la cotización debe sumar Continuidad de Hardware (mensual). */
export function shouldChargeHardwareContinuity(
  modality: VentasBillingModality,
  employeesCount: number,
  options?: {
    rules?: Partial<VentasBusinessRules> | null
    tier?: VentasTierHardwareHints | null
  }
): boolean {
  return resolveHardwareMode(modality, employeesCount, options) === 'continuity'
}

/** True cuando la cotización debe sumar venta one-shot de terminales. */
export function shouldChargeHardwareSale(
  modality: VentasBillingModality,
  employeesCount: number,
  options?: {
    rules?: Partial<VentasBusinessRules> | null
    tier?: VentasTierHardwareHints | null
  }
): boolean {
  return resolveHardwareMode(modality, employeesCount, options) === 'sale'
}

/** True cuando las terminales se presentan como incluidas (sin cargo). */
export function quoteIncludesBiometricTerminals(
  modality: VentasBillingModality,
  employeesCount: number,
  options?: {
    rules?: Partial<VentasBusinessRules> | null
    tier?: VentasTierHardwareHints | null
  }
): boolean {
  return resolveHardwareMode(modality, employeesCount, options) === 'included'
}

/** Descuento fijo sobre terminales adicionales cuando el plan anual ya incluye N. */
export const VENTAS_EXTRA_TERMINALS_DISCOUNT_PCT = 0.2

/**
 * Tope del formulario / cotización automática (cuántas terminales puede elegir el lead).
 * No usa included_terminals_max: ese cupo es “gratis”, no el máximo seleccionable.
 */
export function resolveFormMaxTerminals(rules?: Partial<VentasBusinessRules> | null): number {
  return mergeVentasBusinessRules(rules).max_auto_quote_terminals
}

/** @deprecated Use resolveFormMaxTerminals — kept for callers during transition. */
export function resolveMaxAutoQuoteTerminals(
  rules?: Partial<VentasBusinessRules> | null,
  _tier?: VentasTierHardwareHints | null
): number {
  return resolveFormMaxTerminals(rules)
}

/**
 * Cuántas terminales van incluidas sin cargo en plan anual (modo included).
 * Si el tier no define cupo, se asume el tope del formulario (todas incluidas).
 */
export function resolveIncludedTerminalsCap(
  rules?: Partial<VentasBusinessRules> | null,
  tier?: VentasTierHardwareHints | null
): number {
  const r = mergeVentasBusinessRules(rules)
  const tierMax = tier?.included_terminals_max
  if (tierMax != null && Number.isFinite(Number(tierMax)) && Number(tierMax) >= 1) {
    return Math.trunc(Number(tierMax))
  }
  return r.max_auto_quote_terminals
}

/**
 * Descuento volumen sobre venta de terminales (plan anual en modo sale total).
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

export type HardwareSaleBreakdown = {
  listTotal: number
  discountPct: number
  discountAmount: number
  total: number
  unitPrice: number
}

export function hardwareSaleTotal(
  terminalsCount: number,
  rules?: Partial<VentasBusinessRules> | null
): HardwareSaleBreakdown {
  const n = Math.max(0, Math.floor(Number(terminalsCount) || 0))
  const unitPrice = mergeVentasBusinessRules(rules).hardware_sale_unit_price
  const listTotal = roundMoney(unitPrice * n)
  const discountPct = hardwareSaleVolumeDiscountPct(n)
  const discountAmount = roundMoney(listTotal * discountPct)
  const total = roundMoney(listTotal - discountAmount)
  return { listTotal, discountPct, discountAmount, total, unitPrice }
}

/** Venta de solo terminales extras (plan anual con cupo incluido) a −20%. */
export function hardwareExtraTerminalsSaleTotal(
  extraCount: number,
  rules?: Partial<VentasBusinessRules> | null
): HardwareSaleBreakdown {
  const n = Math.max(0, Math.floor(Number(extraCount) || 0))
  const unitPrice = mergeVentasBusinessRules(rules).hardware_sale_unit_price
  const listTotal = roundMoney(unitPrice * n)
  const discountPct = n > 0 ? VENTAS_EXTRA_TERMINALS_DISCOUNT_PCT : 0
  const discountAmount = roundMoney(listTotal * discountPct)
  const total = roundMoney(listTotal - discountAmount)
  return { listTotal, discountPct, discountAmount, total, unitPrice }
}

export type AnnualHardwareChargeResult = {
  mode: VentasHardwareMode
  includedCount: number
  extraCount: number
  sale: HardwareSaleBreakdown | null
}

/**
 * Cobro de terminales en cotización:
 * - monthly → continuidad (sin venta aquí)
 * - annual sale → todas a precio unitario con descuento volumen
 * - annual included → primeras N gratis; extras a unitario −20%
 */
export function computeAnnualHardwareCharges(params: {
  modality: VentasBillingModality
  employeesCount: number
  terminalsCount: number
  rules?: Partial<VentasBusinessRules> | null
  tier?: VentasTierHardwareHints | null
}): AnnualHardwareChargeResult {
  const { modality, employeesCount, terminalsCount, rules, tier } = params
  const opts = { rules, tier }
  const mode = resolveHardwareMode(modality, employeesCount, opts)
  const n = Math.max(0, Math.floor(Number(terminalsCount) || 0))

  if (mode === 'continuity') {
    return { mode, includedCount: 0, extraCount: 0, sale: null }
  }

  if (mode === 'sale') {
    const sale = n > 0 ? hardwareSaleTotal(n, rules) : null
    return { mode, includedCount: 0, extraCount: n, sale }
  }

  const includedCap = resolveIncludedTerminalsCap(rules, tier)
  const includedCount = Math.min(n, includedCap)
  const extraCount = Math.max(0, n - includedCap)
  const sale = extraCount > 0 ? hardwareExtraTerminalsSaleTotal(extraCount, rules) : null
  return { mode, includedCount, extraCount, sale }
}

export function annualIncludesExtrasMessage(includedCap: number): string {
  return `La modalidad anual incluye hasta ${includedCap} terminales sin costo adicional; las terminales extra se venden por separado.`
}

export function ventasMonthlyUnavailableMessage(rules?: Partial<VentasBusinessRules> | null): string {
  const min = mergeVentasBusinessRules(rules).monthly_min_employees
  return `La modalidad mensual está disponible a partir de ${min} empleados.`
}

export function ventasTooManyTerminalsErrorMessage(rules?: Partial<VentasBusinessRules> | null): string {
  const max = mergeVentasBusinessRules(rules).max_auto_quote_terminals
  return `Para más de ${max} terminales cotizamos aparte. Escríbenos y te confirmamos el monto de terminales y continuidad de hardware.`
}
