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

/** Capa 2: default Sí (true); only false opts out. */
export function resolveEmployeePayOvertime(
  employeePayOvertime: boolean | null | undefined
): boolean {
  return employeePayOvertime !== false
}

export function parseEmployeePayOvertimeInput(value: unknown): boolean {
  if (value === false || value === 'false' || value === 0 || value === '0') return false
  return true
}

/**
 * Company master (pay_overtime) + employee eligibility (pay_overtime).
 * Fixed + hourly + admin_floor: paid when company ON and employee !== false.
 */
export function shouldPayOvertimeToEmployee(
  companyPayOvertime: boolean,
  effectivePayType: EffectivePayType,
  employeePayOvertime?: boolean | null
): boolean {
  if (!companyPayOvertime) return false
  if (!resolveEmployeePayOvertime(employeePayOvertime)) return false
  return (
    effectivePayType === 'fixed' ||
    effectivePayType === 'hourly' ||
    effectivePayType === 'admin_floor'
  )
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

export function normalizeOvertimeBreakdown(
  raw: Partial<OvertimeHoursBreakdown> | null | undefined
): OvertimeHoursBreakdown {
  return {
    diurno: Math.max(0, Number(raw?.diurno) || 0),
    nocturno: Math.max(0, Number(raw?.nocturno) || 0),
    feriado: Math.max(0, Number(raw?.feriado) || 0),
  }
}

/** Read ot_diurno / ot_nocturno / ot_feriado from payroll line metadata (manual override). */
export function readOvertimeOverrideFromMetadata(
  metadata: Record<string, unknown> | null | undefined
): OvertimeHoursBreakdown | null {
  if (!metadata || metadata.ot_adjusted_at == null) return null
  const diurno = Number(metadata.ot_diurno)
  const nocturno = Number(metadata.ot_nocturno)
  const feriado = Number(metadata.ot_feriado)
  if (![diurno, nocturno, feriado].every((n) => Number.isFinite(n) && n >= 0)) {
    return null
  }
  return { diurno, nocturno, feriado }
}

export type ResolveFixedOvertimePayInput = {
  companyPayOvertime: boolean
  employeePayOvertime?: boolean | null
  hourlyRate: number
  ahcBreakdown: OvertimeHoursBreakdown
  overrideBreakdown?: OvertimeHoursBreakdown | null
}

export type ResolveFixedOvertimePayResult = {
  pay: number
  hoursTotal: number
  breakdown: OvertimeHoursBreakdown
  paid: boolean
}

/**
 * Fixed (and shared) OT money resolution: gate → override wins over AHC → premium pay.
 */
export function resolveFixedOvertimePay(
  input: ResolveFixedOvertimePayInput
): ResolveFixedOvertimePayResult {
  const paid = shouldPayOvertimeToEmployee(
    input.companyPayOvertime,
    'fixed',
    input.employeePayOvertime
  )
  const breakdown = normalizeOvertimeBreakdown(
    input.overrideBreakdown ?? input.ahcBreakdown
  )
  const hoursTotal = Math.round(overtimeHoursTotal(breakdown) * 100) / 100
  if (!paid) {
    return { pay: 0, hoursTotal, breakdown, paid: false }
  }
  const pay = calculateOvertimePayFromAhc(breakdown, input.hourlyRate)
  return { pay, hoursTotal, breakdown, paid: true }
}
