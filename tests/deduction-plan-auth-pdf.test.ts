import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { generateDeductionPlanAuthPDF } from '../lib/payroll/deduction-plan-auth-pdf'

function pageCount(pdf: Buffer): number {
  const raw = pdf.toString('latin1')
  const match = raw.match(/\/Count\s+(\d+)/)
  return match ? Number(match[1]) : 0
}

describe('deduction plan authorization pdf', () => {
  it('generates a single-page PDF for a plan', async () => {
    const pdf = await generateDeductionPlanAuthPDF({
      company_name: 'Empresa Demo S.A.',
      employee_name: 'Juan Perez',
      employee_code: 'E100',
      employee_dni: '0801199012345',
      department: 'Operaciones',
      position: 'Analista',
      field_key: 'anticipo_salario',
      field_label: 'Anticipo de salario',
      monto_total: 3000,
      monto_por_plazo: 1000,
      plazos_totales: 3,
      plazos_aplicados: 0,
      fecha_inicio: '2026-07-01',
      fecha_fin: null,
      activo: true,
    })

    assert.ok(Buffer.isBuffer(pdf))
    assert.equal(pdf.subarray(0, 4).toString('latin1'), '%PDF')
    assert.ok(pdf.length > 1200)
    assert.equal(pageCount(pdf), 1)
  })

  it('generates a PDF for a non-anticipo concept', async () => {
    const pdf = await generateDeductionPlanAuthPDF({
      company_name: 'Opticas Centro',
      employee_name: 'Maria Lopez',
      field_key: 'optica',
      field_label: 'Optica / lentes',
      monto_total: 1500,
      monto_por_plazo: 500,
      plazos_totales: 3,
      fecha_inicio: '2026-07-15',
    })

    assert.equal(pdf.subarray(0, 4).toString('latin1'), '%PDF')
    assert.ok(pdf.length > 1200)
    assert.equal(pageCount(pdf), 1)
  })
})
