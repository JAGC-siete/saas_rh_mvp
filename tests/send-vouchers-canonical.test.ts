/**
 * Guard: send-vouchers stays on canonical voucher path.
 * Run: npx tsx --test tests/send-vouchers-canonical.test.ts
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('send-vouchers canonical path', () => {
  it('uses buildVoucherFromRunLine and does not recalculate IHSS from tax brackets', () => {
    const src = readFileSync(
      join(process.cwd(), 'pages/api/payroll/send-vouchers.ts'),
      'utf8'
    )
    assert.match(src, /buildVoucherFromRunLine/)
    assert.match(src, /resolveCanonicalVoucherRunLineId/)
    assert.match(src, /generateEmployeeReceiptPDF/)
    assert.doesNotMatch(src, /calculateIHSS/)
    assert.doesNotMatch(src, /from\('payroll_records'\)/)
    assert.doesNotMatch(src, /honduras-tax/)
  })
})

describe('portal me/payroll API source', () => {
  it('lists run_lines only and never exposes baseSalary', () => {
    const src = readFileSync(
      join(process.cwd(), 'pages/api/employees/me/payroll.ts'),
      'utf8'
    )
    assert.match(src, /payroll_run_lines/)
    assert.match(src, /PORTAL_RELEASED_STATUSES/)
    assert.doesNotMatch(src, /payroll_records/)
    assert.doesNotMatch(src, /baseSalary/)
    assert.doesNotMatch(src, /createEmployeeSalaryClient/)
  })

  it('payroll-pdf uses voucher-from-run-line', () => {
    const src = readFileSync(
      join(process.cwd(), 'pages/api/employees/me/payroll-pdf.ts'),
      'utf8'
    )
    assert.match(src, /buildVoucherFromRunLine/)
    assert.match(src, /resolveCanonicalVoucherRunLineId/)
    assert.doesNotMatch(src, /from\('payroll_records'\)/)
  })
})
