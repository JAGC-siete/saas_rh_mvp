import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  applyDeductionPlansToMetadata,
  buildFixedLinePlanMetadata,
} from '../lib/payroll/fixed-line-recalc'

describe('deduction plan metadata (multi same field_key)', () => {
  it('sums montos for the same field_key and keeps breakdown + ids', () => {
    const meta = buildFixedLinePlanMetadata(2026, [
      { id: 'plan-a', field_key: 'cxc_optica', monto_por_plazo: 100 },
      { id: 'plan-b', field_key: 'cxc_optica', monto_por_plazo: 50 },
      { id: 'plan-c', field_key: 'plan_dental', monto_por_plazo: 200 },
    ])

    assert.equal(meta.cxc_optica, 150)
    assert.equal(meta.plan_dental, 200)
    assert.deepEqual(meta._deduction_plan_ids, ['plan-a', 'plan-b', 'plan-c'])
    assert.deepEqual(meta._deduction_plan_breakdown, [
      { plan_id: 'plan-a', field_key: 'cxc_optica', monto: 100 },
      { plan_id: 'plan-b', field_key: 'cxc_optica', monto: 50 },
      { plan_id: 'plan-c', field_key: 'plan_dental', monto: 200 },
    ])
  })

  it('applyDeductionPlansToMetadata mutates target and clears when empty', () => {
    const target: Record<string, unknown> = { tax_year: 2026, pay_type: 'hourly' }
    applyDeductionPlansToMetadata(target, [
      { id: 'p1', field_key: 'prestamo', monto_por_plazo: 33.333 },
      { id: 'p2', field_key: 'prestamo', monto_por_plazo: 66.667 },
    ])
    assert.equal(target.prestamo, 100)
    assert.deepEqual(target._deduction_plan_ids, ['p1', 'p2'])

    applyDeductionPlansToMetadata(target, [])
    assert.equal(target._deduction_plan_ids, undefined)
    assert.equal(target._deduction_plan_breakdown, undefined)
  })
})
