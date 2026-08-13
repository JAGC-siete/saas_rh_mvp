/**
 * Daily overtime breakdown for voucher page 2 (Enlace-style sheet).
 * Source of truth: attendance_hours_calculation (per day) + monthly÷240 rates.
 */

import { HONDURAS_LABOR_FACTOR } from './constants'
import {
  calculateOvertimePayFromAhc,
  normalizeOvertimeBreakdown,
  overtimeHoursTotal,
  readOvertimeOverrideFromMetadata,
  type OvertimeHoursBreakdown,
} from './overtime-pay'

const DAY_NAMES_ES = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
] as const

export type OvertimeDailyAhcRow = {
  date: string
  evening_25: number
  night_50: number
  late_75: number
  morning_25: number
  holiday_100: number
}

export type OvertimeDailyBreakdownRow = {
  date: string
  dayName: string
  baseSalary: number
  hourlyRate: number
  /** Combined evening + morning @ 1.25 */
  hrs25: number
  rate25: number
  pay25: number
  hrs50: number
  rate50: number
  pay50: number
  hrs75: number
  rate75: number
  pay75: number
  hrs100: number
  rate100: number
  pay100: number
  totalPay: number
  hoursTotal: number
}

export type OvertimeDailyBreakdownSheet = {
  rows: OvertimeDailyBreakdownRow[]
  hourlyRate: number
  baseSalaryMonthly: number
  /** Sum of AHC-derived daily pays */
  breakdownTotalPay: number
  breakdownTotalHours: number
  /** Amount paid on the payroll line (may differ if manual override) */
  paidOvertimePay: number
  hasManualOverride: boolean
  /** True when paid amount differs from AHC daily sum by > 0.02 */
  paidDiffersFromBreakdown: boolean
  showHolidayColumn: boolean
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function hourlyRateFromMonthly(monthlySalary: number): number {
  const monthly = Number(monthlySalary) || 0
  if (monthly <= 0) return 0
  return round2(monthly / HONDURAS_LABOR_FACTOR)
}

export function dayNameFromIsoDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  if (!y || !m || !d) return ''
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
  return DAY_NAMES_ES[dt.getUTCDay()] ?? ''
}

export function ahcRowToBreakdown(row: OvertimeDailyAhcRow): OvertimeHoursBreakdown {
  return normalizeOvertimeBreakdown({
    evening_25: row.evening_25,
    night_50: row.night_50,
    late_75: row.late_75,
    morning_25: row.morning_25,
    holiday_100: row.holiday_100,
  })
}

/** Build one display row from AHC day bands + monthly salary. */
export function buildOvertimeDailyRow(
  row: OvertimeDailyAhcRow,
  monthlySalary: number
): OvertimeDailyBreakdownRow {
  const baseSalary = Number(monthlySalary) || 0
  const hourlyRate = hourlyRateFromMonthly(baseSalary)
  const b = ahcRowToBreakdown(row)
  const hrs25 = round2(b.evening_25 + b.morning_25)
  const rate25 = round2(hourlyRate * 1.25)
  const rate50 = round2(hourlyRate * 1.5)
  const rate75 = round2(hourlyRate * 1.75)
  const rate100 = round2(hourlyRate * 2)
  const pay25 = round2(hrs25 * rate25)
  const pay50 = round2(b.night_50 * rate50)
  const pay75 = round2(b.late_75 * rate75)
  const pay100 = round2(b.holiday_100 * rate100)
  const totalPay = calculateOvertimePayFromAhc(b, hourlyRate)
  return {
    date: row.date,
    dayName: dayNameFromIsoDate(row.date),
    baseSalary,
    hourlyRate,
    hrs25,
    rate25,
    pay25,
    hrs50: round2(b.night_50),
    rate50,
    pay50,
    hrs75: round2(b.late_75),
    rate75,
    pay75,
    hrs100: round2(b.holiday_100),
    rate100,
    pay100,
    totalPay,
    hoursTotal: round2(overtimeHoursTotal(b)),
  }
}

export function buildOvertimeDailyBreakdownSheet(input: {
  ahcDays: OvertimeDailyAhcRow[]
  monthlySalary: number
  paidOvertimePay?: number
  lineMetadata?: Record<string, unknown> | null
}): OvertimeDailyBreakdownSheet | null {
  const monthly = Number(input.monthlySalary) || 0
  if (monthly <= 0) return null

  const rows = input.ahcDays
    .map((d) => buildOvertimeDailyRow(d, monthly))
    .filter((r) => r.hoursTotal > 0)
    .sort((a, b) => a.date.localeCompare(b.date))

  if (rows.length === 0) return null

  const breakdownTotalPay = round2(rows.reduce((s, r) => s + r.totalPay, 0))
  const breakdownTotalHours = round2(rows.reduce((s, r) => s + r.hoursTotal, 0))
  const paidOvertimePay = round2(Number(input.paidOvertimePay) || breakdownTotalPay)
  const hasManualOverride = readOvertimeOverrideFromMetadata(input.lineMetadata) != null
  const paidDiffersFromBreakdown =
    Math.abs(paidOvertimePay - breakdownTotalPay) > 0.02
  const showHolidayColumn = rows.some((r) => r.hrs100 > 0)

  return {
    rows,
    hourlyRate: hourlyRateFromMonthly(monthly),
    baseSalaryMonthly: monthly,
    breakdownTotalPay,
    breakdownTotalHours,
    paidOvertimePay,
    hasManualOverride,
    paidDiffersFromBreakdown,
    showHolidayColumn,
  }
}

type AhcQueryRow = {
  overtime_evening_25_hours?: number | null
  overtime_night_50_hours?: number | null
  overtime_late_75_hours?: number | null
  overtime_morning_25_hours?: number | null
  overtime_holiday_100_hours?: number | null
  overtime_diurno_hours?: number | null
  overtime_nocturno_hours?: number | null
  overtime_feriado_hours?: number | null
  attendance_records?: { date?: string } | { date?: string }[] | null
}

function mapAhcQueryRow(row: AhcQueryRow): OvertimeDailyAhcRow | null {
  const ar = row.attendance_records
  const date =
    Array.isArray(ar) ? ar[0]?.date : ar?.date
  if (!date || typeof date !== 'string') return null

  const evening = Number(row.overtime_evening_25_hours) || 0
  const night = Number(row.overtime_night_50_hours) || 0
  const late = Number(row.overtime_late_75_hours) || 0
  const morning = Number(row.overtime_morning_25_hours) || 0
  const holiday = Number(row.overtime_holiday_100_hours) || 0
  const hasBandCols = evening + night + late + morning + holiday > 0

  if (hasBandCols) {
    return {
      date,
      evening_25: evening,
      night_50: night,
      late_75: late,
      morning_25: morning,
      holiday_100: holiday,
    }
  }

  // Legacy AHC rows without clock bands
  const diurno = Number(row.overtime_diurno_hours) || 0
  const nocturno = Number(row.overtime_nocturno_hours) || 0
  const feriado = Number(row.overtime_feriado_hours) || 0
  if (diurno + nocturno + feriado <= 0) return null
  return {
    date,
    evening_25: diurno,
    night_50: nocturno,
    late_75: 0,
    morning_25: 0,
    holiday_100: feriado,
  }
}

/**
 * Load AHC days for an employee in [periodStart, periodEnd] and build the sheet.
 */
export async function loadOvertimeDailyBreakdownSheet(
  supabase: { from: (t: string) => any },
  input: {
    employeeId: string
    periodStart: string
    periodEnd: string
    monthlySalary: number
    paidOvertimePay?: number
    lineMetadata?: Record<string, unknown> | null
  }
): Promise<OvertimeDailyBreakdownSheet | null> {
  const { data, error } = await supabase
    .from('attendance_hours_calculation')
    .select(
      `
      overtime_evening_25_hours,
      overtime_night_50_hours,
      overtime_late_75_hours,
      overtime_morning_25_hours,
      overtime_holiday_100_hours,
      overtime_diurno_hours,
      overtime_nocturno_hours,
      overtime_feriado_hours,
      attendance_records!inner(date)
    `
    )
    .eq('employee_id', input.employeeId)
    .gte('attendance_records.date', input.periodStart)
    .lte('attendance_records.date', input.periodEnd)

  if (error) {
    console.warn('loadOvertimeDailyBreakdownSheet:', error.message || error)
    return null
  }

  const ahcDays: OvertimeDailyAhcRow[] = []
  for (const row of (data || []) as AhcQueryRow[]) {
    const mapped = mapAhcQueryRow(row)
    if (mapped) ahcDays.push(mapped)
  }

  return buildOvertimeDailyBreakdownSheet({
    ahcDays,
    monthlySalary: input.monthlySalary,
    paidOvertimePay: input.paidOvertimePay,
    lineMetadata: input.lineMetadata,
  })
}
