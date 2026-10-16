import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { checkLeaveDecision } from '../lib/leave/leave-decision'

describe('checkLeaveDecision', () => {
  it('allows deciding a pending request of another employee', () => {
    assert.deepEqual(
      checkLeaveDecision({ currentStatus: 'pending', requestEmployeeId: 'emp-1', actorEmployeeId: 'mgr-1' }),
      { ok: true }
    )
  })

  it('allows actors without an employee record (e.g. super_admin) on pending requests', () => {
    assert.equal(
      checkLeaveDecision({ currentStatus: 'pending', requestEmployeeId: 'emp-1', actorEmployeeId: null }).ok,
      true
    )
  })

  for (const status of ['cancelled', 'approved', 'rejected', null]) {
    it(`blocks deciding a request that is ${status ?? 'missing status'} with 409`, () => {
      const out = checkLeaveDecision({ currentStatus: status, requestEmployeeId: 'emp-1', actorEmployeeId: 'mgr-1' })
      assert.equal(out.ok, false)
      assert.equal(out.ok === false && out.httpStatus, 409)
    })
  }

  it('blocks a manager or HR deciding their own request with 403', () => {
    const out = checkLeaveDecision({ currentStatus: 'pending', requestEmployeeId: 'mgr-1', actorEmployeeId: 'mgr-1' })
    assert.equal(out.ok, false)
    assert.equal(out.ok === false && out.httpStatus, 403)
  })
})
