/**
 * Payroll preview inclusion rules for attendance_required (employees module).
 * Hourly: always included (0 hours when no marks). Fixed exempt: full period days.
 */

import type { EffectivePayType } from './resolve-effective-pay-type'

export function employeeRequiresAttendance(
  attendanceRequired: boolean | null | undefined
): boolean {
  return attendanceRequired !== false
}

export function isFixedAttendanceExempt(
  effectivePayType: EffectivePayType,
  attendanceRequired: boolean | null | undefined
): boolean {
  return effectivePayType === 'fixed' && attendanceRequired === false
}

export function hasValidPayrollAttendanceRecords(
  records: Array<{ check_in?: string | null; status?: string | null }>
): boolean {
  return records.some((r) => Boolean(r.check_in) && r.status !== 'absent')
}

export function shouldIncludeEmployeeInPayrollPreview(
  attendanceRequired: boolean | null | undefined,
  effectivePayType: EffectivePayType,
  hasValidRecords: boolean,
  periodHasAttendanceRecords: boolean
): boolean {
  if (!periodHasAttendanceRecords) return true
  if (effectivePayType === 'hourly') return true
  if (isFixedAttendanceExempt(effectivePayType, attendanceRequired)) return true
  return hasValidRecords
}

export function resolveFixedDaysWorkedForPayroll(
  effectivePayType: EffectivePayType,
  attendanceRequired: boolean | null | undefined,
  registrosCount: number,
  diasPeriodo: number,
  paidLeaveCredits = 0
): {
  daysWorked: number
  includedWithoutAttendance: boolean
  paidLeaveDays: number
} {
  if (isFixedAttendanceExempt(effectivePayType, attendanceRequired)) {
    return { daysWorked: diasPeriodo, includedWithoutAttendance: true, paidLeaveDays: 0 }
  }

  const attendanceDays = registrosCount > 0 ? registrosCount : 0
  const paidLeaveDays = Math.max(0, Number(paidLeaveCredits) || 0)
  let daysWorked: number

  if (attendanceDays + paidLeaveDays > 0) {
    daysWorked = Math.min(diasPeriodo, attendanceDays + paidLeaveDays)
  } else {
    daysWorked = diasPeriodo
  }

  return { daysWorked, includedWithoutAttendance: false, paidLeaveDays }
}

export function parseAttendanceRequiredInput(value: unknown): boolean {
  if (value === false || value === 'false' || value === 0 || value === '0') return false
  return true
}

/** Hourly employees always require attendance tracking; coerce on write. */
export function coerceAttendanceRequiredForPayType(
  payType: 'fixed' | 'hourly' | null | undefined,
  companyCalculationMode: 'daily' | 'hourly',
  attendanceRequired: unknown
): boolean {
  const effective: EffectivePayType =
    payType === 'fixed' || payType === 'hourly'
      ? payType
      : companyCalculationMode === 'hourly'
        ? 'hourly'
        : 'fixed'
  if (effective === 'hourly') return true
  return parseAttendanceRequiredInput(attendanceRequired)
}
