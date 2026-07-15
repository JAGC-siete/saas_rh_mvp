/**
 * Tests: franjas HE por reloj (allocateOvertimeByClockBands).
 * Run: npx tsx --test tests/overtime-bands.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  allocateOvertimeByClockBands,
  classifyLocalMinuteBand,
  ahcRowToOvertimeBreakdown,
} from '../lib/attendance/overtime-bands'

const TZ = 'America/Tegucigalpa'

/** Build a Date in TZ as unix ms roughly via UTC offset approximation for Tegucigalpa (UTC-6). */
function tegMs(y: number, m: number, d: number, hh: number, mm: number): number {
  // Tegucigalpa is UTC-6 year-round
  return Date.UTC(y, m - 1, d, hh + 6, mm, 0)
}

describe('classifyLocalMinuteBand', () => {
  it('maps franjas', () => {
    assert.equal(classifyLocalMinuteBand(17 * 60), 'evening_25')
    assert.equal(classifyLocalMinuteBand(18 * 60 + 59), 'evening_25')
    assert.equal(classifyLocalMinuteBand(19 * 60), 'night_50')
    assert.equal(classifyLocalMinuteBand(21 * 60 + 59), 'night_50')
    assert.equal(classifyLocalMinuteBand(22 * 60), 'late_75')
    assert.equal(classifyLocalMinuteBand(3 * 60), 'late_75')
    assert.equal(classifyLocalMinuteBand(5 * 60), 'morning_25')
    assert.equal(classifyLocalMinuteBand(7 * 60 + 59), 'morning_25')
    assert.equal(classifyLocalMinuteBand(10 * 60), 'evening_25') // daytime → 25%
  })
})

describe('allocateOvertimeByClockBands', () => {
  it('8h day with checkout into evening OT → evening_25', () => {
    // 8:00–17:00 = 9h raw − 1h lunch = 8h ordinary; no OT
    const r = allocateOvertimeByClockBands({
      checkInMs: tegMs(2026, 7, 15, 8, 0),
      checkOutMs: tegMs(2026, 7, 15, 17, 0),
      lunchStartMs: tegMs(2026, 7, 15, 12, 0),
      lunchEndMs: tegMs(2026, 7, 15, 13, 0),
      ordinaryCapHours: 8,
      isHoliday: false,
      timeZone: TZ,
    })
    assert.equal(r.evening_25, 0)
    assert.equal(r.night_50, 0)
  })

  it('work until 19:00 with 8h cap → ~1h evening_25 (17–18) + night start', () => {
    // 8:00–19:00, lunch 12–13 → worked 10h → OT 2h after 8h ordinary
    // Timeline worked: 8–12 (4h), 13–19 (6h) = 10h. Ordinary first 8h ends at 17:00.
    // OT: 17:00–19:00 = 2h evening_25
    const r = allocateOvertimeByClockBands({
      checkInMs: tegMs(2026, 7, 15, 8, 0),
      checkOutMs: tegMs(2026, 7, 15, 19, 0),
      lunchStartMs: tegMs(2026, 7, 15, 12, 0),
      lunchEndMs: tegMs(2026, 7, 15, 13, 0),
      ordinaryCapHours: 8,
      isHoliday: false,
      timeZone: TZ,
    })
    assert.ok(r.evening_25 >= 1.9 && r.evening_25 <= 2.1, `evening=${r.evening_25}`)
    assert.equal(r.night_50, 0)
  })

  it('OT spanning 17–22 → evening + night', () => {
    // 8–22 lunch 12–13 → worked 13h → OT 5h from 17:00–22:00
    // 17–19 evening (2h), 19–22 night (3h)
    const r = allocateOvertimeByClockBands({
      checkInMs: tegMs(2026, 7, 15, 8, 0),
      checkOutMs: tegMs(2026, 7, 15, 22, 0),
      lunchStartMs: tegMs(2026, 7, 15, 12, 0),
      lunchEndMs: tegMs(2026, 7, 15, 13, 0),
      ordinaryCapHours: 8,
      isHoliday: false,
      timeZone: TZ,
    })
    assert.ok(r.evening_25 >= 1.9 && r.evening_25 <= 2.1, `evening=${r.evening_25}`)
    assert.ok(r.night_50 >= 2.9 && r.night_50 <= 3.1, `night=${r.night_50}`)
  })

  it('holiday puts all OT in holiday_100', () => {
    const r = allocateOvertimeByClockBands({
      checkInMs: tegMs(2026, 7, 15, 8, 0),
      checkOutMs: tegMs(2026, 7, 15, 19, 0),
      lunchStartMs: tegMs(2026, 7, 15, 12, 0),
      lunchEndMs: tegMs(2026, 7, 15, 13, 0),
      ordinaryCapHours: 8,
      isHoliday: true,
      timeZone: TZ,
    })
    assert.ok(r.holiday_100 >= 1.9 && r.holiday_100 <= 2.1)
    assert.equal(r.evening_25, 0)
  })
})

describe('ahcRowToOvertimeBreakdown', () => {
  it('prefers new columns when band sum > 0', () => {
    assert.deepEqual(
      ahcRowToOvertimeBreakdown({
        overtime_evening_25_hours: 1,
        overtime_night_50_hours: 2,
        overtime_late_75_hours: 0.5,
        overtime_morning_25_hours: 0,
        overtime_holiday_100_hours: 0,
        overtime_diurno_hours: 99,
      }),
      {
        evening_25: 1,
        night_50: 2,
        late_75: 0.5,
        morning_25: 0,
        holiday_100: 0,
      }
    )
  })

  it('falls back to legacy when new bands are all zero', () => {
    assert.deepEqual(
      ahcRowToOvertimeBreakdown({
        overtime_evening_25_hours: 0,
        overtime_night_50_hours: 0,
        overtime_late_75_hours: 0,
        overtime_morning_25_hours: 0,
        overtime_holiday_100_hours: 0,
        overtime_diurno_hours: 1.5,
        overtime_nocturno_hours: 0.5,
        overtime_feriado_hours: 2,
      }),
      {
        evening_25: 1.5,
        night_50: 0.5,
        late_75: 0,
        morning_25: 0,
        holiday_100: 2,
      }
    )
  })
})
