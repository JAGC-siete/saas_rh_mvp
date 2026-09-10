/**
 * Guard: portal list + send-vouchers net = display net; tipo filter; paid in CLOSED.
 * Run: npx tsx --test tests/portal-display-fidelity.test.ts
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { mapReleasedRunLineToPortalItem } from '../lib/employee-portal/released-payroll'
import { resolveDisplayNet } from '../lib/payroll/resolve-display-net'
import { resolvePlanillaDaysWorked } from '../lib/payroll/planilla-from-run'

describe('portal map filters company tipo', () => {
  it('drops lines whose run tipo ≠ companyTipo', () => {
    const item = mapReleasedRunLineToPortalItem(
      {
        id: 'line-con',
        eff_bruto: 1000,
        eff_neto: 900,
        payroll_runs: {
          year: 2026,
          month: 9,
          quincena: 1,
          status: 'authorized',
          tipo: 'CON',
        },
      },
      { companyTipo: '2PAGOS' }
    )
    assert.equal(item, null)
  })

  it('keeps matching tipo and exposes tipo on item', () => {
    const item = mapReleasedRunLineToPortalItem(
      {
        id: 'line-2p',
        eff_bruto: 1000,
        eff_neto: 900,
        payroll_runs: {
          year: 2026,
          month: 9,
          quincena: 1,
          status: 'authorized',
          tipo: '2PAGOS',
        },
      },
      { companyTipo: '2PAGOS' }
    )
    assert.ok(item)
    assert.equal(item!.tipo, '2PAGOS')
  })
})

describe('display net vs stored neto (R1 anchor)', () => {
  it('display net subtracts customs even when eff_neto ignored them', () => {
    const bruto = 1000
    const statutory = 50
    const customs = 100
    const storedNeto = 950 // only bruto − statutory
    const display = resolveDisplayNet({
      bruto,
      totalDeductions: statutory + customs,
      customDeductions: customs,
      storedNeto,
    })
    assert.equal(display, 850)
    assert.notEqual(display, storedNeto)
  })
})

describe('voucher days_worked (R2 anchor)', () => {
  it('uses metadata days for hourly, not floor(eff_hours)', () => {
    assert.equal(resolvePlanillaDaysWorked('hourly', 80, 10), 10)
    assert.notEqual(Math.floor(80), 10)
  })
})

describe('source guards', () => {
  it('me/payroll uses display net helper + company tipo', () => {
    const src = readFileSync(
      join(process.cwd(), 'pages/api/employees/me/payroll.ts'),
      'utf8'
    )
    assert.match(src, /resolveRunLineDisplayNet/)
    assert.match(src, /loadCompanyPortalPayrollTipo/)
    assert.match(src, /payroll_runs\.tipo/)
  })

  it('send-vouchers email body uses voucherData.record.net_salary', () => {
    const src = readFileSync(
      join(process.cwd(), 'pages/api/payroll/send-vouchers.ts'),
      'utf8'
    )
    assert.match(src, /netSalary:\s*voucherData\.record\.net_salary/)
    assert.doesNotMatch(src, /netSalary:\s*line\.eff_neto/)
  })

  it('resolve-voucher CLOSED includes paid', () => {
    const src = readFileSync(
      join(process.cwd(), 'lib/payroll/resolve-voucher-run-line.ts'),
      'utf8'
    )
    assert.match(src, /CLOSED_STATUSES = \['authorized', 'distributed', 'paid'\]/)
  })

  it('voucher-from-run-line uses resolvePlanillaDaysWorked', () => {
    const src = readFileSync(
      join(process.cwd(), 'lib/payroll/voucher-from-run-line.ts'),
      'utf8'
    )
    assert.match(src, /resolvePlanillaDaysWorked/)
    assert.doesNotMatch(src, /Math\.floor\(lineData\.eff_hours/)
  })

  it('dashboard subtracts lunch via markSpanWorkedHours', () => {
    const src = readFileSync(
      join(process.cwd(), 'pages/api/employees/dashboard.ts'),
      'utf8'
    )
    assert.match(src, /markSpanWorkedHours/)
    assert.match(src, /lunch_start/)
  })
})
