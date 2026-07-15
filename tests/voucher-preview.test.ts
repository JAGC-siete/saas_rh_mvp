import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildVoucherPreviewPayload } from '../lib/payroll/voucher-preview'
import type { VoucherFromRunLineResult } from '../lib/payroll/voucher-from-run-line'

const sampleVoucher: VoucherFromRunLineResult = {
  record: {
    employee_code: '23',
    employee_name: 'Arnoldo Neptali Oseguera',
    department: 'Operaciones',
    position: 'Gestor',
    period_start: '2026-06-16',
    period_end: '2026-06-30',
    days_worked: 15,
    base_salary: 7500,
    income_tax: 0,
    professional_tax: 23.23,
    social_security: 297.58,
    total_deductions: 509.51,
    net_salary: 6990.49,
    bank_name: '',
    bank_account: '729047781',
    custom_deductions: [{ name: 'Impuesto Municipal', amount: 188.7 }],
  },
  periodo: '2026-06',
  quincena: 2,
  companyName: 'Enlace',
  periodLabel: 'Quincena 2',
  employeeCode: '23',
  filename: 'recibo_23_2026-06_q2.pdf',
}

describe('buildVoucherPreviewPayload', () => {
  it('includes employee, earnings, deductions and net summary', () => {
    const preview = buildVoucherPreviewPayload('line-1', sampleVoucher)
    assert.equal(preview.companyName, 'Enlace')
    assert.ok(preview.employee.some((p) => p.value.includes('Arnoldo')))
    assert.equal(preview.earnings[0]?.amount, 7500)
    assert.ok(preview.deductions.some((d) => d.label === 'Impuesto Municipal'))
    assert.equal(preview.netSalary, 6990.49)
    assert.equal(preview.totalDeductions, 509.51)
  })

  it('respects hidden voucher sections from report config', () => {
    const withoutCustom = {
      ...sampleVoucher,
      record: { ...sampleVoucher.record, custom_deductions: [] },
    }
    const preview = buildVoucherPreviewPayload('line-1', withoutCustom, {
      visibleSections: new Set(['emp_name', 'base_salary', 'net_salary']),
    })
    assert.equal(preview.employee.length, 1)
    assert.equal(preview.earnings.length, 1)
    assert.equal(preview.deductions.length, 0)
    assert.equal(preview.bank.length, 0)
  })

  it('includes overtime pay as a separate earnings line with hours in the label', () => {
    const withOt: VoucherFromRunLineResult = {
      ...sampleVoucher,
      record: {
        ...sampleVoucher.record,
        base_salary: 8000,
        overtime_pay: 1385.83,
        horas_extras: 16.63,
        net_salary: 8957.52,
      },
    }
    const preview = buildVoucherPreviewPayload('line-ot', withOt)
    assert.equal(preview.earnings.length, 2)
    assert.equal(preview.earnings[0]?.amount, 8000)
    assert.equal(preview.earnings[1]?.amount, 1385.83)
    assert.match(preview.earnings[1]?.label || '', /16\.63 h/)
  })

  it('hides overtime pay when voucher config omits overtime_pay section', () => {
    const withOt: VoucherFromRunLineResult = {
      ...sampleVoucher,
      record: {
        ...sampleVoucher.record,
        overtime_pay: 500,
        horas_extras: 4,
      },
    }
    const preview = buildVoucherPreviewPayload('line-ot-hidden', withOt, {
      visibleSections: new Set(['base_salary', 'net_salary']),
    })
    assert.equal(preview.earnings.length, 1)
    assert.equal(preview.earnings[0]?.amount, sampleVoucher.record.base_salary)
  })
})
