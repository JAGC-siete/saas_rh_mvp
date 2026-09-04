import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  decideFieldPunchAction,
  isFieldProtectedRecord,
  buildFieldRecordFlags,
} from '../lib/attendance/field-punch-action'
import { resolveFieldAttendancePolicy } from '../lib/attendance/field-policy'

describe('decideFieldPunchAction', () => {
  it('null record → check_in', () => {
    assert.equal(decideFieldPunchAction(null), 'check_in')
  })

  it('absent shell (no marks) → check_in, not check_out', () => {
    assert.equal(
      decideFieldPunchAction({
        check_in: null,
        check_out: null,
        status: 'absent',
      }),
      'check_in'
    )
  })

  it('has check_in only → check_out', () => {
    assert.equal(
      decideFieldPunchAction({
        check_in: '2026-09-04T14:00:00.000Z',
        check_out: null,
      }),
      'check_out'
    )
  })

  it('has both marks → day_complete', () => {
    assert.equal(
      decideFieldPunchAction({
        check_in: '2026-09-04T14:00:00.000Z',
        check_out: '2026-09-04T23:00:00.000Z',
      }),
      'day_complete'
    )
  })
})

describe('field record protection flags', () => {
  it('detects field_protected / channel', () => {
    assert.equal(isFieldProtectedRecord({ field_protected: true }), true)
    assert.equal(isFieldProtectedRecord({ channel: 'field_mobile' }), true)
    assert.equal(isFieldProtectedRecord({}), false)
  })

  it('buildFieldRecordFlags sets protection and clears daily_close_absent', () => {
    const flags = buildFieldRecordFlags({ daily_close_absent: true, punch_count: 0 })
    assert.equal(flags.field_protected, true)
    assert.equal(flags.channel, 'field_mobile')
    assert.equal(flags.daily_close_absent, false)
    assert.equal(flags.punch_count, 0)
  })
})

describe('resolveFieldAttendancePolicy webauthn', () => {
  it('always requires webauthn even if settings try to disable', () => {
    const p = resolveFieldAttendancePolicy({
      field_attendance: { require_webauthn: false },
    })
    assert.equal(p.require_webauthn, true)
  })
})
