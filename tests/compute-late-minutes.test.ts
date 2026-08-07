import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  computeSignedLateMinutes,
  lateFieldsForAttendanceRecord,
  normalizeTimeForDb,
  parseHhmmToMinutes,
} from '../lib/attendance/compute-late-minutes'

describe('compute-late-minutes', () => {
  it('parseHhmmToMinutes handles HH:MM and HH:MM:SS', () => {
    assert.equal(parseHhmmToMinutes('08:00'), 8 * 60)
    assert.equal(parseHhmmToMinutes('11:30:00'), 11 * 60 + 30)
    assert.equal(parseHhmmToMinutes(null), null)
  })

  it('normalizeTimeForDb pads to HH:MM:SS', () => {
    assert.equal(normalizeTimeForDb('8:5'), '08:05:00')
    assert.equal(normalizeTimeForDb('11:30:45'), '11:30:45')
  })

  it('computes signed late minutes in America/Tegucigalpa', () => {
    // 11:40 HN = 17:40 UTC
    const late = computeSignedLateMinutes({
      checkInIso: '2026-08-06T17:40:00.000Z',
      expectedStart: '11:00',
      timeZone: 'America/Tegucigalpa',
    })
    assert.equal(late, 40)

    // 10:50 HN = 16:50 UTC → 10 min early
    const early = computeSignedLateMinutes({
      checkInIso: '2026-08-06T16:50:00.000Z',
      expectedStart: '11:00',
      timeZone: 'America/Tegucigalpa',
    })
    assert.equal(early, -10)
  })

  it('lateFieldsForAttendanceRecord skips flex and missing schedule', () => {
    assert.deepEqual(
      lateFieldsForAttendanceRecord({
        checkInIso: '2026-08-06T17:40:00.000Z',
        expectedStart: '11:00',
        shiftType: 'flex',
      }),
      { expected_check_in: null, late_minutes: null }
    )
    assert.deepEqual(
      lateFieldsForAttendanceRecord({
        checkInIso: '2026-08-06T17:40:00.000Z',
        expectedStart: null,
      }),
      { expected_check_in: null, late_minutes: null }
    )
  })

  it('lateFieldsForAttendanceRecord persists expected + signed minutes (>5 = tarde KPI)', () => {
    const fields = lateFieldsForAttendanceRecord({
      checkInIso: '2026-08-06T17:40:00.000Z',
      expectedStart: '11:00:00',
      shiftType: 'normal',
      timeZone: 'America/Tegucigalpa',
    })
    assert.equal(fields.expected_check_in, '11:00:00')
    assert.equal(fields.late_minutes, 40)
    assert.ok((fields.late_minutes ?? 0) > 5)
  })

  it('counts 110m late (Manuel-style) within 4h window', () => {
    // 09:05 HN vs 07:15 → +110m
    const fields = lateFieldsForAttendanceRecord({
      checkInIso: '2026-08-07T15:05:00.000Z',
      expectedStart: '07:15',
      shiftType: 'normal',
      timeZone: 'America/Tegucigalpa',
    })
    assert.equal(fields.expected_check_in, '07:15:00')
    assert.equal(fields.late_minutes, 110)
    assert.equal(fields.outside_start_window, undefined)
  })

  it('ignores punches far from schedule start (night punch vs morning start)', () => {
    // 21:58 HN vs 11:00 → 658m; outside 4h window → not KPI tarde
    const fields = lateFieldsForAttendanceRecord({
      checkInIso: '2026-08-07T03:58:00.000Z',
      expectedStart: '11:00',
      shiftType: 'normal',
      timeZone: 'America/Tegucigalpa',
    })
    assert.equal(fields.expected_check_in, '11:00:00')
    assert.equal(fields.late_minutes, 0)
    assert.equal(fields.outside_start_window, true)
  })
})
