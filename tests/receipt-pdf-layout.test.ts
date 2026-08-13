import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { generateEmployeeReceiptPDF } from '../lib/payroll/receipt'

const baseRecord = {
  employee_code: 'E001',
  employee_name: 'Arnoldo Neptali Oseguera',
  department: 'Operaciones',
  position: 'Gestor de Operaciones Aduanales',
  period_start: '2026-06-16',
  period_end: '2026-06-30',
  days_worked: 15,
  base_salary: 7500,
  income_tax: 120,
  professional_tax: 45,
  social_security: 230,
  total_deductions: 605,
  net_salary: 6895,
  bank_name: 'BAC Honduras',
  bank_account: '729047781',
  custom_deductions: [{ name: 'Deducción especial', amount: 105 }],
}

const allSectionIds = [
  'emp_code',
  'emp_name',
  'department',
  'position',
  'period',
  'days_worked',
  'base_salary',
  'septimo_dia',
  'overtime_pay',
  'ihss',
  'rap',
  'isr',
  'custom_deductions',
  'total_deductions',
  'net_salary',
  'bank_name',
  'bank_account',
  'legal_notes',
  'signatures',
]

function pageCount(pdf: Buffer): number {
  const raw = pdf.toString('latin1')
  const match = raw.match(/\/Count\s+(\d+)/)
  return match ? Number(match[1]) : 0
}

describe('employee receipt pdf layout', () => {
  it('renders a single page with all standard sections', async () => {
    const pdf = await generateEmployeeReceiptPDF(
      baseRecord,
      '2026-06',
      2,
      undefined,
      'Empresa de Prueba S. de R.L.',
      'Quincena 2',
      { visibleSections: new Set(allSectionIds) }
    )

    assert.ok(Buffer.isBuffer(pdf))
    assert.equal(pageCount(pdf), 1)
  })

  it('still renders a single page when custom_deductions section is hidden in config', async () => {
    const withoutCustomSection = allSectionIds.filter((id) => id !== 'custom_deductions')
    const pdf = await generateEmployeeReceiptPDF(
      baseRecord,
      '2026-06',
      2,
      undefined,
      'Empresa de Prueba S. de R.L.',
      'Quincena 2',
      { visibleSections: new Set(withoutCustomSection) }
    )

    assert.equal(pageCount(pdf), 1)
    assert.ok(pdf.length > 1200)
  })

  it('still renders a single page when overtime earnings are present', async () => {
    const pdf = await generateEmployeeReceiptPDF(
      {
        ...baseRecord,
        base_salary: 8000,
        overtime_pay: 1385.83,
        horas_extras: 16.63,
        net_salary: 8280.83,
      },
      '2026-07',
      1,
      undefined,
      'Empresa de Prueba S. de R.L.',
      'Quincena 1',
      { visibleSections: new Set(allSectionIds) }
    )

    assert.equal(pageCount(pdf), 1)
    assert.ok(pdf.length > 1200)
  })
})
