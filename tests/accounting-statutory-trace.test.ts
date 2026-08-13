import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
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
    assert.equal(resolvePayrollLineTaxYear([2026, 2026, null]), 2026)
    assert.equal(resolvePayrollLineTaxYear([null, undefined]), null)
    assert.equal(resolvePayrollLineTaxYear([2025, 2026]), 2025)
  })

  it('conecta statutory-deductions-compute con journal-generator en pipeline', () => {
    assert.ok(PAYROLL_STATUTORY_PIPELINE.deductions.includes('statutory-deductions-compute'))
    assert.ok(PAYROLL_STATUTORY_PIPELINE.journal.includes('journal-generator'))
  })

  it('arma bloque statutory para source_reference', () => {
    const block = buildJournalStatutoryTraceBlock({
      trace: sampleTrace,
      retentionTotals: { ihss: 100, rap: 50, isr: 200 },
      payrollLineTaxYear: 2026
    })

    assert.deepEqual(block.retention_totals, { ihss: 100, rap: 50, isr: 200 })
    assert.equal(block.trace.dataSource, 'payroll_statutory_params')
    assert.equal(block.pipeline.deductions, 'lib/payroll/statutory-deductions-compute.ts')
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

    assert.equal(ref.payroll_run_id, 'run-1')
    assert.equal(ref.statutory?.retention_totals.ihss, 10)
    assert.ok(ref.generated_at)
  })
})
