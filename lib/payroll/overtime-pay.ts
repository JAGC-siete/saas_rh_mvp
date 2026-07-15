import type { EffectivePayType } from './resolve-effective-pay-type'

/**
 * Franjas de HE (recargo sobre tarifa horaria = mensual÷240):
 * - evening_25: 5:00pm–6:59pm → ×1.25 (25%)
 * - night_50:   7:00pm–9:59pm → ×1.50 (50%)
 * - late_75:    10:00pm–4:59am → ×1.75 (75%)
 * - morning_25: 5:00am–7:59am → ×1.25 (25%)
 * - holiday_100: días feriados → ×2.00 (100%)
 */
export type OvertimeHoursBreakdown = {
  evening_25: number
  night_50: number
  late_75: number
  morning_25: number
  holiday_100: number
}

export const OVERTIME_BAND_META = [
  {
    key: 'evening_25' as const,
    label: '5:00 pm a 6:59 pm al 25%',
    multiplier: 1.25,
    metaKey: 'ot_evening_25',
  },
  {
    key: 'night_50' as const,
    label: '7:00 pm a 9:59 pm al 50%',
    multiplier: 1.5,
    metaKey: 'ot_night_50',
  },
  {
    key: 'late_75' as const,
    label: '10:00 pm a 4:59 am al 75%',
    multiplier: 1.75,
    metaKey: 'ot_late_75',
  },
  {
    key: 'morning_25' as const,
    label: '5:00 am a 7:59 am al 25%',
    multiplier: 1.25,
    metaKey: 'ot_morning_25',
  },
  {
    key: 'holiday_100' as const,
    label: 'Días feriados al 100%',
    multiplier: 2,
    metaKey: 'ot_holiday_100',
  },
] as const

/** Grupos de UI por porcentaje (unifica evening_25 + morning_25). La lógica interna sigue en 5 franjas. */
export type OvertimePercentGroupKey = 'pct_25' | 'night_50' | 'late_75' | 'holiday_100'

export const OVERTIME_PERCENT_GROUPS = [
  {
    key: 'pct_25' as const,
    label: 'Al 25% (5:00 pm a 6:59 pm y 5:00 am a 6:59 am)',
  },
  {
    key: 'night_50' as const,
    label: 'Al 50% (7:00 pm a 9:59 pm)',
  },
  {
    key: 'late_75' as const,
    label: 'Al 75% (10:00 pm a 4:59 am)',
  },
  {
    key: 'holiday_100' as const,
    label: 'Al 100% (días feriados)',
  },
] as const

/** Suma evening+morning para el campo unificado del 25%. */
export function breakdownToPercentGroupValues(
  b: OvertimeHoursBreakdown
): Record<OvertimePercentGroupKey, number> {
  return {
    pct_25: Math.max(0, Number(b.evening_25) || 0) + Math.max(0, Number(b.morning_25) || 0),
    night_50: Math.max(0, Number(b.night_50) || 0),
    late_75: Math.max(0, Number(b.late_75) || 0),
    holiday_100: Math.max(0, Number(b.holiday_100) || 0),
  }
}

/**
 * Expande grupos de UI → breakdown de pago.
 * El 25% unificado se guarda en evening_25 (mismo ×1.25); morning_25 = 0.
 * AHC sigue clasificando las dos franjas al recalcular.
 */
export function percentGroupValuesToBreakdown(
  g: Partial<Record<OvertimePercentGroupKey, number>>
): OvertimeHoursBreakdown {
  return {
    evening_25: Math.max(0, Number(g.pct_25) || 0),
    night_50: Math.max(0, Number(g.night_50) || 0),
    late_75: Math.max(0, Number(g.late_75) || 0),
    morning_25: 0,
    holiday_100: Math.max(0, Number(g.holiday_100) || 0),
  }
}

export function emptyOvertimeBreakdown(): OvertimeHoursBreakdown {
  return {
    evening_25: 0,
    night_50: 0,
    late_75: 0,
    morning_25: 0,
    holiday_100: 0,
  }
}

/**
 * Mapeo AHC legacy (diurno/nocturno/feriado) → franjas de pago.
 * AHC no distingue 7–10pm vs 10pm–5am ni mañana; noche → night_50, feriado → holiday_100.
 */
export function mapLegacyAhcBucketsToBreakdown(input: {
  diurno?: number
  nocturno?: number
  feriado?: number
}): OvertimeHoursBreakdown {
  return {
    evening_25: Math.max(0, Number(input.diurno) || 0),
    night_50: Math.max(0, Number(input.nocturno) || 0),
    late_75: 0,
    morning_25: 0,
    holiday_100: Math.max(0, Number(input.feriado) || 0),
  }
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
  const b = normalizeOvertimeBreakdown(ot)
  const pay =
    b.evening_25 * rate * 1.25 +
    b.night_50 * rate * 1.5 +
    b.late_75 * rate * 1.75 +
    b.morning_25 * rate * 1.25 +
    b.holiday_100 * rate * 2
  return Math.round(pay * 100) / 100
}

export function overtimeHoursTotal(ot: OvertimeHoursBreakdown): number {
  const b = normalizeOvertimeBreakdown(ot)
  return b.evening_25 + b.night_50 + b.late_75 + b.morning_25 + b.holiday_100
}

export function normalizeOvertimeBreakdown(
  raw: Partial<OvertimeHoursBreakdown> | null | undefined
): OvertimeHoursBreakdown {
  return {
    evening_25: Math.max(0, Number(raw?.evening_25) || 0),
    night_50: Math.max(0, Number(raw?.night_50) || 0),
    late_75: Math.max(0, Number(raw?.late_75) || 0),
    morning_25: Math.max(0, Number(raw?.morning_25) || 0),
    holiday_100: Math.max(0, Number(raw?.holiday_100) || 0),
  }
}

export function overtimeBreakdownToMetadata(
  breakdown: OvertimeHoursBreakdown
): Record<string, number> {
  const b = normalizeOvertimeBreakdown(breakdown)
  return {
    ot_evening_25: b.evening_25,
    ot_night_50: b.night_50,
    ot_late_75: b.late_75,
    ot_morning_25: b.morning_25,
    ot_holiday_100: b.holiday_100,
  }
}

/** Read band overrides from payroll line metadata (manual override). */
export function readOvertimeOverrideFromMetadata(
  metadata: Record<string, unknown> | null | undefined
): OvertimeHoursBreakdown | null {
  if (!metadata || metadata.ot_adjusted_at == null) return null

  const hasNew =
    metadata.ot_evening_25 != null ||
    metadata.ot_night_50 != null ||
    metadata.ot_late_75 != null ||
    metadata.ot_morning_25 != null ||
    metadata.ot_holiday_100 != null

  if (hasNew) {
    const evening_25 = Number(metadata.ot_evening_25) || 0
    const night_50 = Number(metadata.ot_night_50) || 0
    const late_75 = Number(metadata.ot_late_75) || 0
    const morning_25 = Number(metadata.ot_morning_25) || 0
    const holiday_100 = Number(metadata.ot_holiday_100) || 0
    const vals = [evening_25, night_50, late_75, morning_25, holiday_100]
    if (!vals.every((n) => Number.isFinite(n) && n >= 0)) return null
    return { evening_25, night_50, late_75, morning_25, holiday_100 }
  }

  // Compat: overrides guardados con diurno/nocturno/feriado
  if (
    metadata.ot_diurno != null ||
    metadata.ot_nocturno != null ||
    metadata.ot_feriado != null
  ) {
    return mapLegacyAhcBucketsToBreakdown({
      diurno: Number(metadata.ot_diurno) || 0,
      nocturno: Number(metadata.ot_nocturno) || 0,
      feriado: Number(metadata.ot_feriado) || 0,
    })
  }

  return null
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
