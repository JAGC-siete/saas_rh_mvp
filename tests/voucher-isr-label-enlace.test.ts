/**
 * Run: node --import tsx --test tests/voucher-isr-label-enlace.test.ts
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildVoucherPdfOptions } from '../lib/payroll/voucher-pdf-options'
import { buildVoucherPreviewPayload } from '../lib/payroll/voucher-preview'

describe('voucher ISR label Retención Asalariada', () => {
  it('preview deductions use report config isr label', () => {
    const opts = buildVoucherPdfOptions({
      columns: [
        { id: 'isr', label: 'Retención Asalariada', sourceField: 'income_tax', source: 'standard' },
        { id: 'ihss', label: 'IHSS', sourceField: 'social_security', source: 'standard' },
        { id: 'rap', label: 'RAP', sourceField: 'professional_tax', source: 'standard' },
        { id: 'net_salary', label: 'Total a recibir', sourceField: 'net_salary', source: 'standard' },
        { id: 'emp_name', label: 'Nombre', sourceField: 'employee_name', source: 'standard' },
        { id: 'base_salary', label: 'Salario base', sourceField: 'base_salary', source: 'standard' },
      ],
      branding: { primaryColor: '#0b4fa1' },
      includeCustomPayrollFields: true,
    })

    assert.equal(opts.labels?.isr, 'Retención Asalariada')

    const preview = buildVoucherPreviewPayload(
      'line-m00120',
      {
        record: {
          employee_code: 'M00120',
          employee_name: 'Maria Isabel Giron',
          department: 'Administración',
          position: 'Auxiliar',
          period_start: '2026-07-16',
          period_end: '2026-07-31',
          days_worked: 15,
          base_salary: 16480.23,
          income_tax: 726.68,
          professional_tax: 157.93,
          social_security: 297.58,
          total_deductions: 1182.19,
          net_salary: 15298.04,
          bank_name: '',
          bank_account: '',
          custom_deductions: [],
        },
        periodo: '2026-07',
        quincena: 2,
        companyName: 'Enlace',
        periodLabel: 'Quincena 2',
        employeeCode: 'M00120',
        filename: 'recibo_test.pdf',
      },
      opts
    )

    const isrLine = preview.deductions.find((d) => Math.abs(d.amount - 726.68) < 0.01)
    assert.ok(isrLine)
    assert.equal(isrLine!.label, 'Retención Asalariada')
  })
})
