/** Standard payroll_adjustments fields that drive apply_adjustment_update_eff. */
export const STANDARD_PAYROLL_ADJUSTMENT_FIELDS = [
  'hours',
  'bruto',
  'ihss',
  'rap',
  'isr',
  'neto',
] as const

export type StandardPayrollAdjustmentField =
  (typeof STANDARD_PAYROLL_ADJUSTMENT_FIELDS)[number]
