import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  collectDeductionPlanIncrements,
  shouldIncrementDeductionPlan,
} from '../lib/payroll/deduction-plan-authorize'

describe('collectDeductionPlanIncrements', () => {
  it('dedupes repeated plan ids on the same employee line', () => {
    const out = collectDeductionPlanIncrements([
      {
        id: 'line-1',
        employee_id: 'emp-1',
        metadata: { _deduction_plan_ids: ['plan-a', 'plan-a', 'plan-b'] },
      },
    ])
    assert.deepEqual(out, [
      { planId: 'plan-a', employeeId: 'emp-1', runLineId: 'line-1' },
      { planId: 'plan-b', employeeId: 'emp-1', runLineId: 'line-1' },
    ])
  })

  it('skips lines without employee or ids', () => {
    const out = collectDeductionPlanIncrements([
      { id: 'line-1', employee_id: null, metadata: { _deduction_plan_ids: ['p1'] } },
      { id: 'line-2', employee_id: 'emp-2', metadata: {} },
    ])
    assert.deepEqual(out, [])
  })
})

describe('shouldIncrementDeductionPlan', () => {
  it('allows active plan with remaining plazos', () => {
    assert.equal(
      shouldIncrementDeductionPlan({
        activo: true,
        plazos_aplicados: 0,
        plazos_totales: 2,
      }),
      true
    )
  })

  it('skips inactive (cancelled) plans left in stale metadata', () => {
    assert.equal(
      shouldIncrementDeductionPlan({
        activo: false,
        plazos_aplicados: 0,
        plazos_totales: 2,
      }),
      false
    )
  })

  it('skips exhausted plans', () => {
    assert.equal(
      shouldIncrementDeductionPlan({
        activo: true,
        plazos_aplicados: 2,
        plazos_totales: 2,
      }),
      false
    )
  })
})
