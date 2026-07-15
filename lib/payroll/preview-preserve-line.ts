/**
 * Rules for skipping preview recalculation when a payroll line was manually edited.
 */

export type PersistedPayrollLine = {
  id: string
  employee_id?: string
  edited?: boolean | null
  metadata?: Record<string, unknown> | null
  eff_hours?: number | null
  eff_bruto?: number | null
  eff_ihss?: number | null
  eff_rap?: number | null
  eff_isr?: number | null
  eff_neto?: number | null
}

export function shouldPreservePayrollLineOnPreview(
  line: PersistedPayrollLine | null | undefined
): boolean {
  if (!line) return false
  if (line.edited === true) return true
  const meta = line.metadata
  if (meta != null && meta.days_adjusted_at != null) return true
  if (meta != null && meta.ot_adjusted_at != null) return true
  if (meta != null && meta.statutory_zeroed_at != null) return true
  return false
}

/** Prefer embedded HE hours from preserved metadata over live AHC when present. */
export function resolvePreservedHorasExtras(
  metadata: Record<string, unknown> | null | undefined,
  liveAhcHours: number
): number {
  const fromMeta = Number(metadata?.horas_extras)
  if (Number.isFinite(fromMeta) && fromMeta >= 0) {
    return Math.round(fromMeta * 100) / 100
  }
  return Math.round((Number(liveAhcHours) || 0) * 100) / 100
}

type EmployeePreviewContext = {
  id: string
  dni?: string | null
  employee_code?: string | null
  name?: string | null
  bank_name?: string | null
  bank_account?: string | null
  base_salary: number
}

type BuildRowBase = {
  emp: EmployeePreviewContext
  departmentName: string
  prevLine: PersistedPayrollLine
  horasExtras: number
  diasPeriodo: number
}

export function buildFixedPlanillaRowFromPersistedLine(ctx: BuildRowBase) {
  const { emp, departmentName, prevLine, horasExtras, diasPeriodo } = ctx
  const effH = Number(prevLine.eff_hours) || 0
  const effBruto = Number(prevLine.eff_bruto) || 0
  const effIhss = Number(prevLine.eff_ihss) || 0
  const effRap = Number(prevLine.eff_rap) || 0
  const effIsr = Number(prevLine.eff_isr) || 0
  const effNeto = Number(prevLine.eff_neto) || 0
  const totalDed = effBruto - effNeto
  const heHours = resolvePreservedHorasExtras(
    prevLine.metadata as Record<string, unknown> | null | undefined,
    horasExtras
  )
  const metaOtPay = Number(
    (prevLine.metadata as Record<string, unknown> | null | undefined)?.overtime_pay
  )

  return {
    employee_id: emp.id,
    id: emp.employee_code || '',
    name: emp.name || 'Sin nombre',
    bank: emp.bank_name || 'No especificado',
    bank_account: emp.bank_account || 'No especificado',
    department: departmentName,
    base_salary: ctx.emp.base_salary,
    monthly_salary: ctx.emp.base_salary,
    days_worked: effH,
    days_absent: Math.max(0, diasPeriodo - effH),
    horas_extras: heHours,
    ...(Number.isFinite(metaOtPay) && metaOtPay > 0
      ? { overtime_pay: Math.round(metaOtPay * 100) / 100 }
      : {}),
    total_earnings: Math.round(effBruto * 100) / 100,
    IHSS: Math.round(effIhss * 100) / 100,
    RAP: Math.round(effRap * 100) / 100,
    ISR: Math.round(effIsr * 100) / 100,
    total_deducciones: Math.round(Math.max(0, totalDed) * 100) / 100,
    total: Math.round(effNeto * 100) / 100,
    line_id: prevLine.id,
    pay_type: 'fixed' as const,
    metadata: prevLine.metadata,
    edited: prevLine.edited === true,
  }
}

export function buildHourlyPlanillaRowFromPersistedLine(
  ctx: BuildRowBase & {
    daysWorked: number
    hourlyRate: number
    /** Preserve admin_floor vs hourly on regenerate */
    payType?: 'hourly' | 'admin_floor'
  }
) {
  const {
    emp,
    departmentName,
    prevLine,
    horasExtras,
    diasPeriodo,
    daysWorked,
    hourlyRate,
    payType = 'hourly',
  } = ctx
  const effH = Number(prevLine.eff_hours) || 0
  const effBruto = Number(prevLine.eff_bruto) || 0
  const effIhss = Number(prevLine.eff_ihss) || 0
  const effRap = Number(prevLine.eff_rap) || 0
  const effIsr = Number(prevLine.eff_isr) || 0
  const effNeto = Number(prevLine.eff_neto) || 0
  const totalDed = effBruto - effNeto

  return {
    employee_id: emp.id,
    id: emp.employee_code || '',
    name: emp.name || 'Sin nombre',
    bank: emp.bank_name || 'No especificado',
    bank_account: emp.bank_account || 'No especificado',
    department: departmentName,
    base_salary: emp.base_salary,
    monthly_salary: emp.base_salary,
    days_worked: daysWorked,
    days_absent: Math.max(0, diasPeriodo - daysWorked),
    horas_extras: Math.round(horasExtras * 100) / 100,
    total_hours_worked: Math.round(effH * 100) / 100,
    hourly_rate: Math.round(hourlyRate * 100) / 100,
    total_earnings: Math.round(effBruto * 100) / 100,
    IHSS: Math.round(effIhss * 100) / 100,
    RAP: Math.round(effRap * 100) / 100,
    ISR: Math.round(effIsr * 100) / 100,
    total_deducciones: Math.round(Math.max(0, totalDed) * 100) / 100,
    total: Math.round(effNeto * 100) / 100,
    line_id: prevLine.id,
    pay_type: payType,
    metadata: prevLine.metadata,
    edited: prevLine.edited === true,
  }
}

/** Keys removed when resetting a line to recalculate from attendance. */
export const PAYROLL_LINE_MANUAL_METADATA_KEYS = [
  'days_adjusted_at',
  'days_adjusted_by',
  'days_adjusted_reason',
  'days_adjust_reason',
  'ot_adjusted_at',
  'ot_adjusted_by',
  'ot_adjusted_reason',
  'ot_adjust_reason',
  'ot_evening_25',
  'ot_night_50',
  'ot_late_75',
  'ot_morning_25',
  'ot_holiday_100',
  'ot_diurno',
  'ot_nocturno',
  'ot_feriado',
  'statutory_zeroed_at',
  'statutory_zeroed_by',
  'statutory_zeroed_reason',
  'statutory_zero_ihss',
  'statutory_zero_rap',
  'statutory_zero_isr',
] as const

export function stripManualPayrollLineMetadata(
  metadata: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  const base = { ...(metadata || {}) }
  for (const key of PAYROLL_LINE_MANUAL_METADATA_KEYS) {
    delete base[key]
  }
  return base
}
