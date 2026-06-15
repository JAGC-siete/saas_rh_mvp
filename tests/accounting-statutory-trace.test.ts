import { describe, expect, it } from 'vitest'
import {
  buildJournalPayrollSourceReference,
  buildJournalStatutoryTraceBlock,
  PAYROLL_STATUTORY_PIPELINE,
  resolvePayrollLineTaxYear
} from '../lib/accounting/payroll-statutory-trace'
import type { PayrollStatutoryTrace } from '../lib/tax/statutory-trace'

const sampleTrace: PayrollStatutoryTrace = {
  countryCode: 'HND',
  year: 2026,
  requestedYear: 2026,
  resolvedYear: 2026,
  usedFallback: false,
  dataSource: 'payroll_statutory_params',
  sourceLabel: 'backfill'
}

describe('payroll-statutory-trace', () => {
  it('resuelve tax_year único de líneas de planilla', () => {
    expect(resolvePayrollLineTaxYear([2026, 2026, null])).toBe(2026)
    expect(resolvePayrollLineTaxYear([null, undefined])).toBeNull()
    expect(resolvePayrollLineTaxYear([2025, 2026])).toBe(2025)
  })

  it('conecta statutory-deductions-compute con journal-generator en pipeline', () => {
    expect(PAYROLL_STATUTORY_PIPELINE.deductions).toContain(
      'statutory-deductions-compute'
    )
    expect(PAYROLL_STATUTORY_PIPELINE.journal).toContain('journal-generator')
  })

  it('arma bloque statutory para source_reference', () => {
    const block = buildJournalStatutoryTraceBlock({
      trace: sampleTrace,
      retentionTotals: { ihss: 100, rap: 50, isr: 200 },
      payrollLineTaxYear: 2026
    })

    expect(block.retention_totals).toEqual({ ihss: 100, rap: 50, isr: 200 })
    expect(block.trace.dataSource).toBe('payroll_statutory_params')
    expect(block.pipeline.deductions).toBe(
      'lib/payroll/statutory-deductions-compute.ts'
    )
  })

  it('incluye statutory en source_reference de asiento', () => {
    const statutory = buildJournalStatutoryTraceBlock({
      trace: sampleTrace,
      retentionTotals: { ihss: 10, rap: 5, isr: 0 }
    })
    const ref = buildJournalPayrollSourceReference({
      payrollRunId: 'run-1',
      period: '2026-06 Q1',
      statutory
    })

    expect(ref.payroll_run_id).toBe('run-1')
    expect(ref.statutory?.retention_totals.ihss).toBe(10)
    expect(ref.generated_at).toBeTruthy()
  })
})
