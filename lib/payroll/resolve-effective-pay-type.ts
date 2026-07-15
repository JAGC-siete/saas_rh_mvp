/**
 * Resolves employee pay type with company calculation_mode inheritance.
 * NULL employee pay_type → daily→fixed, hourly→hourly, admin_floor→admin_floor.
 */

export type CompanyCalculationMode = 'daily' | 'hourly' | 'admin_floor'
export type EffectivePayType = 'fixed' | 'hourly' | 'admin_floor'
export type EmployeePayType = 'fixed' | 'hourly' | 'admin_floor' | null | undefined

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
 * Pay type for planilla PDF / vista previa from live employee + company default.
 * Live employee wins; metadata snapshot is only a fallback when employee has no
 * pay_type AND company mode does not resolve the same way (legacy lines).
 * Stale metadata.pay_type='hourly' must not override admin-por-día (fixed).
 */
export function resolvePlanillaRowPayType(input: {
  employeePayType: unknown
  metadataPayType?: unknown
  companyCalculationMode?: CompanyCalculationMode | string | null
}): EffectivePayType {
  const fromEmployee = parseEmployeePayType(input.employeePayType)
  if (fromEmployee) return fromEmployee

  const companyMode = parseCompanyCalculationMode(input.companyCalculationMode ?? 'daily')
  const inherited = resolveEffectivePayType(null, companyMode)
  // Prefer company inheritance over stale line metadata (e.g. old hourly stamp).
  if (inherited === 'fixed') return 'fixed'

  const fromMeta = parseEmployeePayType(input.metadataPayType)
  if (fromMeta) return fromMeta
  return inherited
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
