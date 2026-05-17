import type { EffectivePayType } from './resolve-effective-pay-type'

export type OvertimeHoursBreakdown = {
  diurno: number
  nocturno: number
  feriado: number
}

/** true if absent or explicitly true; only false when metadata.pay_overtime === false */
export function resolveCompanyPayOvertime(
  metadata: Record<string, unknown> | null | undefined
): boolean {
  return metadata?.pay_overtime !== false
}

/**
 * MVP: company master switch + hourly only (fixed stays informational unless phase-2 override).
 */
export function shouldPayOvertimeToEmployee(
  companyPayOvertime: boolean,
  effectivePayType: EffectivePayType,
  employeePayOvertime?: boolean | null
): boolean {
  if (!companyPayOvertime) return false
  if (effectivePayType === 'hourly') return true
  // Phase 2: explicit employee override for fixed
  return employeePayOvertime === true
}

export function calculateOvertimePayFromAhc(
  ot: OvertimeHoursBreakdown,
  hourlyRate: number
): number {
  const rate = Number(hourlyRate) || 0
  if (rate <= 0) return 0
  const diurno = Number(ot.diurno) || 0
  const nocturno = Number(ot.nocturno) || 0
  const feriado = Number(ot.feriado) || 0
  const pay =
    diurno * rate * 1.25 + nocturno * rate * 1.5 + feriado * rate * 1.75
  return Math.round(pay * 100) / 100
}

export function overtimeHoursTotal(ot: OvertimeHoursBreakdown): number {
  return (Number(ot.diurno) || 0) + (Number(ot.nocturno) || 0) + (Number(ot.feriado) || 0)
}
