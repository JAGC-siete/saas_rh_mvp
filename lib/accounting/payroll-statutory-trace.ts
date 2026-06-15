import type { PayrollStatutoryTrace } from '../tax/statutory-trace'

/** Cadena de módulos: deducciones de ley → asientos contables. */
export const PAYROLL_STATUTORY_PIPELINE = {
  deductions: 'lib/payroll/statutory-deductions-compute.ts',
  journal: 'lib/accounting/journal-generator.ts',
  employerContributions: 'lib/payroll/employer-contributions.ts',
  laborProvisions: 'lib/payroll/labor-provisions.ts'
} as const

export type JournalRetentionTotals = {
  ihss: number
  rap: number
  isr: number
}

export type JournalStatutoryTraceBlock = {
  trace: PayrollStatutoryTrace
  /** Montos de retención leídos de payroll_run_lines (origen: statutory-deductions-compute). */
  retention_totals: JournalRetentionTotals
  /** Año fiscal registrado en líneas de planilla, si existe. */
  payroll_line_tax_year?: number | null
  pipeline: typeof PAYROLL_STATUTORY_PIPELINE
}

export type JournalPayrollSourceReference = {
  payroll_run_id: string
  period: string
  generated_at: string
  type?: 'severance' | 'payroll'
  statutory?: JournalStatutoryTraceBlock
}

export function resolvePayrollLineTaxYear(
  taxYears: Array<number | null | undefined>
): number | null {
  const distinct = [
    ...new Set(
      taxYears.filter((y): y is number => typeof y === 'number' && Number.isFinite(y))
    )
  ]
  if (distinct.length === 1) return distinct[0]
  if (distinct.length === 0) return null
  return distinct[0]
}

export function buildJournalStatutoryTraceBlock(input: {
  trace: PayrollStatutoryTrace
  retentionTotals: JournalRetentionTotals
  payrollLineTaxYear?: number | null
}): JournalStatutoryTraceBlock {
  return {
    trace: input.trace,
    retention_totals: input.retentionTotals,
    payroll_line_tax_year: input.payrollLineTaxYear ?? null,
    pipeline: PAYROLL_STATUTORY_PIPELINE
  }
}

export function buildJournalPayrollSourceReference(input: {
  payrollRunId: string
  period: string
  statutory?: JournalStatutoryTraceBlock
  type?: JournalPayrollSourceReference['type']
}): JournalPayrollSourceReference {
  return {
    payroll_run_id: input.payrollRunId,
    period: input.period,
    generated_at: new Date().toISOString(),
    ...(input.type ? { type: input.type } : {}),
    ...(input.statutory ? { statutory: input.statutory } : {})
  }
}
