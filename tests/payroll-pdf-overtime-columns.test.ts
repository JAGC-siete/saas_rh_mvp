/**
 * Planilla PDF: columnas de HE cuando hay datos.
 * Run: npx tsx --test tests/payroll-pdf-overtime-columns.test.ts
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { generateConsolidatedPayrollPDF, type PlanillaItem } from '../lib/payroll/report'

function pageCount(pdf: Buffer): number {
  const raw = pdf.toString('latin1')
  const match = raw.match(/\/Count\s+(\d+)/)
  return match ? Number(match[1]) : 0
}

const baseFixed = (overrides: Partial<PlanillaItem> = {}): PlanillaItem => ({
  id: 'K02173',
  name: 'Kevin Aguilar',
  bank: 'BANCO',
  bank_account: '123',
  department: 'Ops',
  monthly_salary: 16000,
  days_worked: 15,
  days_absent: 0,
  late_days: 0,
  total_earnings: 9385.83,
  IHSS: 297.58,
  RAP: 30.73,
  ISR: 0,
  total_deductions: 428.31,
  total: 8957.52,
  pay_type: 'fixed',
  ...overrides,
})

describe('payroll PDF overtime columns', () => {
  it('renders PDF when fixed employees have horas_extras and overtime_pay', async () => {
    const pdf = await generateConsolidatedPayrollPDF(
      [
        baseFixed({
          horas_extras: 16.63,
          overtime_pay: 1385.83,
        }),
      ],
      [],
      '2026-07',
      1,
      undefined,
      'Enlace',
      undefined,
      {
        currency: 'HNL',
        payment_frequency: 'quincenal',
        legal_deductions: { ihss: true, rap: true, isr: false },
        country_code: 'HND',
      },
      { period_start: '2026-07-01', period_end: '2026-07-15' }
    )

    assert.ok(Buffer.isBuffer(pdf))
    assert.ok(pageCount(pdf) >= 2)
    assert.ok(pdf.length > 2000)
  })
})
