import type { PayrollPeriodConfig } from './period-dates'

export type CompanyPayrollConfigRow = {
  payment_frequency?: string | null
  quincena_config?: Record<string, number> | null
  metadata?: Record<string, unknown> | null
}

/** Build PayrollPeriodConfig from company_payroll_configs row (same logic as upcoming-periods API). */
export function buildCompanyPeriodConfig(
  config: CompanyPayrollConfigRow | null | undefined
): PayrollPeriodConfig {
  const meta = (config?.metadata ?? {}) as Record<string, unknown>
  const qc = (config?.quincena_config ?? null) as Record<string, number> | null
  const cutDates = (meta.payment_cut_dates ?? {}) as Record<string, unknown>
  const rawFreq = config?.payment_frequency ?? meta.payment_frequency ?? 'quincenal'
  const paymentFrequency =
    rawFreq === 'monthly' || rawFreq === 'mensual'
      ? 'mensual'
      : rawFreq === 'weekly' || rawFreq === 'semanal'
        ? 'semanal'
        : 'quincenal'

  return {
    payment_frequency: paymentFrequency,
    monthly_type: (cutDates.monthly_type as 'standard' | 'custom') || 'standard',
    monthly_start: (cutDates.monthly_start as number) ?? qc?.monthly_start ?? 1,
    monthly_end: (cutDates.monthly_end as number) ?? qc?.monthly_end ?? 30,
    biweekly_type: (cutDates.biweekly_type as 'standard' | 'custom') || 'standard',
    biweekly_first_start: qc?.first_start ?? (cutDates.biweekly_first_start as number) ?? 1,
    biweekly_first_end: qc?.first_end ?? (cutDates.biweekly_first_end as number) ?? 15,
    biweekly_second_start: qc?.second_start ?? (cutDates.biweekly_second_start as number) ?? 16,
    biweekly_second_end: qc?.second_end ?? (cutDates.biweekly_second_end as number) ?? 30,
    weekly_type: (cutDates.weekly_type as 'standard' | 'custom') || 'standard',
  }
}
