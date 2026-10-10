import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildCustomFieldsAdjustmentRows } from '../lib/payroll/custom-fields-eff-amounts'
import { STANDARD_PAYROLL_ADJUSTMENT_FIELDS } from '../lib/payroll/standard-adjustment-fields'

const ids = { runLineId: 'line-1', companyId: 'co-1', userId: 'user-1' }

describe('buildCustomFieldsAdjustmentRows', () => {
  it('audits a custom deduction keyed `isr` as custom_isr so the trigger cannot override eff_isr', () => {
    // Engine skips reserved `isr` in deducciones adicionales, so neto only drops by seguro_medico.
    const rows = buildCustomFieldsAdjustmentRows({
      ...ids,
      oldEffBruto: 17500,
      newEffBruto: 17500,
      oldEffNeto: 17029.19,
      newEffNeto: 16395.49,
      existingMetadata: { isr: 0, seguro_medico: 0, pay_type: 'fixed' },
      mergedMetadata: { isr: 920.16, seguro_medico: 633.7, pay_type: 'fixed' },
    })

    const fields = rows.map((r) => r.field).sort()
    assert.deepEqual(fields, ['custom_isr', 'neto', 'seguro_medico'])
    assert.ok(!rows.some((r) => r.field === 'isr'))
    assert.deepEqual(
      rows.find((r) => r.field === 'custom_isr'),
      {
        run_line_id: 'line-1',
        company_id: 'co-1',
        user_id: 'user-1',
        field: 'custom_isr',
        old_value: 0,
        new_value: 920.16,
      }
    )
  })

  it('never emits a standard trigger field from a metadata key', () => {
    const existingMetadata: Record<string, unknown> = {}
    const mergedMetadata: Record<string, unknown> = {}
    for (const f of STANDARD_PAYROLL_ADJUSTMENT_FIELDS) mergedMetadata[f] = 10

    const rows = buildCustomFieldsAdjustmentRows({
      ...ids,
      oldEffBruto: 100,
      newEffBruto: 100,
      oldEffNeto: 90,
      newEffNeto: 90,
      existingMetadata,
      mergedMetadata,
    })

    assert.deepEqual(
      rows.map((r) => r.field).sort(),
      STANDARD_PAYROLL_ADJUSTMENT_FIELDS.map((f) => `custom_${f}`).sort()
    )
  })

  it('keeps bruto/neto rows and plain custom keys as before', () => {
    const rows = buildCustomFieldsAdjustmentRows({
      ...ids,
      oldEffBruto: 1000,
      newEffBruto: 1200,
      oldEffNeto: 900,
      newEffNeto: 1050,
      existingMetadata: { cxc_optica: '50', _deduction_plan_breakdown: [{ amount: 1 }] },
      mergedMetadata: { cxc_optica: '50', bono: 200, _deduction_plan_breakdown: [{ amount: 2 }] },
    })

    assert.deepEqual(
      rows.map((r) => [r.field, r.old_value, r.new_value]),
      [
        ['bruto', 1000, 1200],
        ['neto', 900, 1050],
        ['bono', null, 200],
      ]
    )
  })
})
