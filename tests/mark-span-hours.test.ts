/**
 * markSpanWorkedHours — portal clock-span with lunch subtract.
 * Run: npx tsx --test tests/mark-span-hours.test.ts
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { markSpanWorkedHours } from '../lib/attendance/mark-span-hours'

describe('markSpanWorkedHours', () => {
  it('returns null without both check marks', () => {
    assert.equal(markSpanWorkedHours({ check_in: '2026-09-01T14:00:00.000Z' }), null)
    assert.equal(markSpanWorkedHours({ check_out: '2026-09-01T23:00:00.000Z' }), null)
  })

  it('subtracts lunch when both lunch marks exist', () => {
    const hours = markSpanWorkedHours({
      check_in: '2026-09-01T14:00:00.000Z', // 08:00 HN
      check_out: '2026-09-01T23:00:00.000Z', // 17:00 HN
      lunch_start: '2026-09-01T18:00:00.000Z', // 12:00
      lunch_end: '2026-09-01T19:00:00.000Z', // 13:00
    })
    assert.equal(hours, 8)
  })

  it('keeps full span when lunch incomplete', () => {
    const hours = markSpanWorkedHours({
      check_in: '2026-09-01T14:00:00.000Z',
      check_out: '2026-09-01T23:00:00.000Z',
      lunch_start: '2026-09-01T18:00:00.000Z',
      lunch_end: null,
    })
    assert.equal(hours, 9)
  })
})
