/**
 * Verifica que los 3 empleados Enlace Q2 con ISR > 0 muestran
 * «Retención Asalariada» en el desglose del recibo (preview path).
 * Run: node --import tsx --test tests/enlace-q2-voucher-isr-breakdown.test.ts
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildVoucherPdfOptions } from '../lib/payroll/voucher-pdf-options'
import { buildVoucherPreviewPayload } from '../lib/payroll/voucher-preview'
import type { EmployeeReceiptInput } from '../lib/payroll/receipt'
import type { VoucherFromRunLineResult } from '../lib/payroll/voucher-from-run-line'

/** Snapshot DB Q2 Enlace — únicos con eff_isr > 0 */
const WITH_ISR = [
  {
    code: 'E07448',
    name: 'Edwin Hernandez Matalon',
    bruto: 15000,
    ihss: 297.58,
    rap: 135.73,
    isr: 507.97,
    neto: 13425.01,
    customs: 633.71, // seguro_medico
  },
  {
    code: 'L00120',
    name: 'Lex Emel Perez Castillo',
    bruto: 17500,
    ihss: 297.58,
    rap: 173.23,
    isr: 920.16,
    neto: 15475.32,
    customs: 633.71,
  },
  {
    code: 'M00120',
    name: 'Maria Isabel Giron',
    bruto: 16480.23,
    ihss: 297.58,
    rap: 157.93,
    isr: 726.68,
    neto: 15298.04,
    customs: 0,
  },
] as const

const enlaceVoucherOpts = buildVoucherPdfOptions({
  columns: [
    { id: 'emp_name', label: 'Nombre', sourceField: 'employee_name', source: 'standard' },
    { id: 'base_salary', label: 'Salario base', sourceField: 'base_salary', source: 'standard' },
    { id: 'ihss', label: 'IHSS', sourceField: 'social_security', source: 'standard' },
    { id: 'rap', label: 'RAP', sourceField: 'professional_tax', source: 'standard' },
    { id: 'isr', label: 'Retención Asalariada', sourceField: 'income_tax', source: 'standard' },
    {
      id: 'custom_deductions',
      label: 'Deducciones adicionales',
      sourceField: 'custom_deductions',
      source: 'standard',
    },
    { id: 'total_deductions', label: 'Total deducciones', sourceField: 'total_deductions', source: 'standard' },
    { id: 'net_salary', label: 'Total a recibir', sourceField: 'net_salary', source: 'standard' },
  ],
  branding: { primaryColor: '#0b4fa1' },
  includeCustomPayrollFields: true,
})

function voucherFor(emp: (typeof WITH_ISR)[number]): VoucherFromRunLineResult {
  const statutory = emp.ihss + emp.rap + emp.isr
  const totalDed = Math.round((statutory + emp.customs) * 100) / 100
  const record: EmployeeReceiptInput = {
    employee_code: emp.code,
    employee_name: emp.name,
    department: 'N/A',
    position: 'N/A',
    period_start: '2026-07-16',
    period_end: '2026-07-31',
    days_worked: 15,
    base_salary: emp.bruto,
    income_tax: emp.isr,
    professional_tax: emp.rap,
    social_security: emp.ihss,
    total_deductions: totalDed,
    net_salary: emp.neto,
    bank_name: '',
    bank_account: '',
    custom_deductions:
      emp.customs > 0
        ? [{ name: 'Seguro Médico y Hospitalario', amount: emp.customs }]
        : [],
  }
  return {
    record,
    periodo: '2026-07',
    quincena: 2,
    companyName: 'Enlace',
    periodLabel: 'Quincena 2',
    employeeCode: emp.code,
    filename: `recibo_${emp.code}.pdf`,
  }
}

describe('Enlace Q2 — 3 empleados con retención en recibo', () => {
  it('hay exactamente 3 montos ISR conocidos y cada recibo los lista', () => {
    assert.equal(WITH_ISR.length, 3)

    for (const emp of WITH_ISR) {
      const preview = buildVoucherPreviewPayload(`line-${emp.code}`, voucherFor(emp), enlaceVoucherOpts)
      const retencion = preview.deductions.find((d) => d.label === 'Retención Asalariada')
      assert.ok(retencion, `${emp.code}: falta línea Retención Asalariada`)
      assert.equal(retencion!.amount, emp.isr, `${emp.code}: monto ISR`)
      assert.ok(retencion!.amount > 0, `${emp.code}: ISR debe ser > 0`)

      // Desglose legales completo
      assert.ok(preview.deductions.some((d) => d.label === 'IHSS' && d.amount === emp.ihss))
      assert.ok(preview.deductions.some((d) => d.label === 'RAP' && d.amount === emp.rap))
    }
  })
})
