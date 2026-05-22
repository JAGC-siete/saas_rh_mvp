import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { addDaysIso, planAssignmentConflictResolutions } from '../lib/attendance/schedule-assignment-logic'

describe('schedule-assignment-logic', () => {
  it('trims overlapping assignment ending after new start', () => {
    const actions = planAssignmentConflictResolutions(
      [{ id: 'a1', employee_id: 'e1', valid_from: '2026-06-01', valid_to: '2026-06-15', work_schedule_id: 's1' }],
      '2026-06-10',
      '2026-06-30'
    )
    assert.equal(actions.length, 1)
    assert.deepEqual(actions[0], { action: 'update', id: 'a1', valid_to: '2026-06-09' })
  })

  it('deletes assignment fully inside new range', () => {
    const actions = planAssignmentConflictResolutions(
      [{ id: 'a1', employee_id: 'e1', valid_from: '2026-06-12', valid_to: '2026-06-14', work_schedule_id: 's1' }],
      '2026-06-10',
      '2026-06-30'
    )
    assert.deepEqual(actions[0], { action: 'delete', id: 'a1' })
  })

  it('addDaysIso subtracts one day', () => {
    assert.equal(addDaysIso('2026-06-10', -1), '2026-06-09')
  })
})
