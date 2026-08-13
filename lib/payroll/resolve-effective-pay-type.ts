/**
 * Resolves employee pay type with company calculation_mode inheritance.
 * NULL employee pay_type → daily→fixed, hourly→hourly, admin_floor→admin_floor.
 *
 * ## Planilla / PDF pay_type contract
 *
 * - **Authorized / distributed / paid runs:** `metadata.pay_type` on each
 *   `payroll_run_line` is immutable. PDF, planilla preview, and detalle readonly
 *   must use that stamp (not live `employees.pay_type`) so classification matches
 *   the frozen `eff_*` amounts. To change pay type + amounts, open a new draft
 *   run or recalculate before authorize.
 * - **Draft / edited runs:** amounts are also snapshots until preview regenerates.
 *   If live effective pay type drifts from `metadata.pay_type`, block PDF/planilla
 *   until the user regenerates preview ({@link linePayTypeDriftedFromEmployee}).
 */

export type CompanyCalculationMode = 'daily' | 'hourly' | 'admin_floor'
export type EffectivePayType = 'fixed' | 'hourly' | 'admin_floor'
export type EmployeePayType = 'fixed' | 'hourly' | 'admin_floor' | null | undefined

export const PAYROLL_NEEDS_REGENERATE_CODE = 'PAYROLL_NEEDS_REGENERATE'

export const PAYROLL_NEEDS_REGENERATE_MESSAGE =
  'Hay cambios en el tipo de pago de empleados que aún no están reflejados en esta nómina. Regenerá la vista previa para ver los últimos cambios.'

export function isFrozenPayrollRunStatus(status: string | null | undefined): boolean {
  return status === 'authorized' || status === 'distributed' || status === 'paid'
}

/** Draft/edited (and similar) can regenerate preview to pick up master-data changes. */
export function isMutablePayrollRunStatus(status: string | null | undefined): boolean {
  return status === 'draft' || status === 'edited' || status === 'pending'
}

export function parseCompanyCalculationMode(raw: unknown): CompanyCalculationMode {
  if (raw === 'hourly' || raw === 'admin_floor') return raw
  return 'daily'
}

export function parseEmployeePayType(raw: unknown): 'fixed' | 'hourly' | 'admin_floor' | null {
  if (raw === 'fixed' || raw === 'hourly' || raw === 'admin_floor') return raw
  return null
}

export function resolveEffectivePayType(
  employeePayType: EmployeePayType,
  companyCalculationMode: CompanyCalculationMode | string = 'daily'
): EffectivePayType {
  if (
    employeePayType === 'fixed' ||
    employeePayType === 'hourly' ||
    employeePayType === 'admin_floor'
  ) {
    return employeePayType
  }
  const mode = parseCompanyCalculationMode(companyCalculationMode)
  if (mode === 'hourly') return 'hourly'
  if (mode === 'admin_floor') return 'admin_floor'
  return 'fixed'
}

/** Hourly wage engine (exact hours or admin floor). */
export function isHourBasedPayType(effective: EffectivePayType): boolean {
  return effective === 'hourly' || effective === 'admin_floor'
}

/** Classic admin: period salary × days. */
export function isFixedDayPayType(effective: EffectivePayType): boolean {
  return effective === 'fixed'
}

/**
 * Normalize raw pay_type for planilla/PDF splitting.
 * Prefer explicit value; unknown → fixed.
 */
export function coalescePlanillaPayType(raw: unknown): EffectivePayType {
  if (raw === 'hourly' || raw === 'admin_floor' || raw === 'fixed') return raw
  return 'fixed'
}

/**
 * Pay type for planilla PDF / vista previa from run lines.
 *
 * Prefers immutable line `metadata.pay_type` (wage-engine stamp at last calc).
 * Falls back to live employee, then company calculation_mode inheritance.
 * See module contract above for authorized vs draft.
 */
export function resolvePlanillaRowPayType(input: {
  employeePayType: unknown
  metadataPayType?: unknown
  companyCalculationMode?: CompanyCalculationMode | string | null
}): EffectivePayType {
  const fromMeta = parseEmployeePayType(input.metadataPayType)
  if (fromMeta) return fromMeta

  const fromEmployee = parseEmployeePayType(input.employeePayType)
  if (fromEmployee) return fromEmployee

  return resolveEffectivePayType(
    null,
    parseCompanyCalculationMode(input.companyCalculationMode ?? 'daily')
  )
}

/**
 * True when the line was calculated under a different pay type than the
 * employee's current effective type (master-data change after last preview).
 * Only meaningful when metadata.pay_type was stamped.
 */
export function linePayTypeDriftedFromEmployee(input: {
  employeePayType: unknown
  metadataPayType?: unknown
  companyCalculationMode?: CompanyCalculationMode | string | null
}): boolean {
  const stamped = parseEmployeePayType(input.metadataPayType)
  if (!stamped) return false
  const live = resolveEffectivePayType(
    parseEmployeePayType(input.employeePayType),
    parseCompanyCalculationMode(input.companyCalculationMode ?? 'daily')
  )
  return stamped !== live
}

export class PayrollNeedsRegenerateError extends Error {
  readonly code: typeof PAYROLL_NEEDS_REGENERATE_CODE = PAYROLL_NEEDS_REGENERATE_CODE
  constructor(message: string = PAYROLL_NEEDS_REGENERATE_MESSAGE) {
    super(message)
    this.name = 'PayrollNeedsRegenerateError'
  }
}

/**
 * Wage-engine check (hourly rate / clock hours): hourly + admin_floor.
 * Do NOT use this alone to put rows on the PDF "por hora" table — use
 * {@link isExactHourlyPlanillaTablePayType} so admin_floor stays with fijos
 * (same rule as UnifiedPayrollTable detalle).
 */
export function isHourBasedPlanillaPayType(raw: unknown): boolean {
  return isHourBasedPayType(coalescePlanillaPayType(raw))
}

/**
 * PDF / vista previa table split — matches detalle UI:
 * only true `hourly` → "Empleados por hora"; fixed + admin_floor → fijos.
 */
export function isExactHourlyPlanillaTablePayType(raw: unknown): boolean {
  return coalescePlanillaPayType(raw) === 'hourly'
}
