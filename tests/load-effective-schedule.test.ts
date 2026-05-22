import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  expectedCheckInFromLoaded,
  workScheduleToPortalPayload,
  type LoadedEffectiveSchedule,
} from '../lib/attendance/load-effective-schedule'

const baseSchedule = {
  id: 'ws-1',
  name: 'Turno A',
  monday_start: '08:00',
  monday_end: '17:00',
  shift_config: {
    monday: { type: 'continuous' as const, start: '09:00', end: '18:00', break: 60 },
  },
}

describe('load-effective-schedule helpers', () => {
  it('expectedCheckInFromLoaded returns start from times', () => {
    const loaded = {
      result: { found: true, workScheduleId: 'ws-1', source: 'assignment' as const },
      schedule: baseSchedule,
      times: { type: 'continuous' as const, start: '09:00', end: '18:00' },
    } satisfies LoadedEffectiveSchedule
    assert.equal(expectedCheckInFromLoaded(loaded), '09:00')
  })

  it('workScheduleToPortalPayload includes today fields when loaded', () => {
    const loaded = {
      result: { found: true, workScheduleId: 'ws-1', source: 'employee_default' as const },
      schedule: baseSchedule,
      times: { type: 'off' as const, start: null, end: null },
    } satisfies LoadedEffectiveSchedule
    const payload = workScheduleToPortalPayload(baseSchedule, loaded)
    assert.equal(payload?.id, 'ws-1')
    assert.equal(payload?.schedule_source, 'employee_default')
    assert.equal(payload?.today_start, null)
    assert.equal(payload?.day_type, 'off')
  })
})
