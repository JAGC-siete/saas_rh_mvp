/**
 * Resolves employee pay type with company calculation_mode inheritance.
 * NULL employee pay_type → daily→fixed, hourly→hourly.
 */

export type CompanyCalculationMode = 'daily' | 'hourly'
export type EffectivePayType = 'fixed' | 'hourly'

export function resolveEffectivePayType(
  employeePayType: 'fixed' | 'hourly' | null | undefined,
  companyCalculationMode: CompanyCalculationMode = 'daily'
): EffectivePayType {
  if (employeePayType === 'fixed' || employeePayType === 'hourly') {
    return employeePayType
  }
  return companyCalculationMode === 'hourly' ? 'hourly' : 'fixed'
}
