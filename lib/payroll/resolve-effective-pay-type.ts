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
