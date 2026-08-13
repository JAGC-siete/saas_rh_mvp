import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  getAttendanceMarksValidationError,
  humanizeAttendanceHoursCalcError,
} from '../lib/attendance/validate-marks'

describe('getAttendanceMarksValidationError', () => {
  it('acepta turno con almuerzo dentro del rango', () => {
    const err = getAttendanceMarksValidationError({
      check_in: '2026-08-06T16:21:00.000Z',
      check_out: '2026-08-07T04:14:00.000Z',
      lunch_start: '2026-08-06T20:00:00.000Z',
      lunch_end: '2026-08-06T23:54:00.000Z',
    })
    assert.equal(err, null)
  })

  it('acepta solo entrada/salida sin almuerzo', () => {
    const err = getAttendanceMarksValidationError({
      check_in: '2026-08-06T16:21:00.000Z',
      check_out: '2026-08-06T20:00:00.000Z',
      lunch_start: null,
      lunch_end: null,
    })
    assert.equal(err, null)
  })

  it('rechaza almuerzo después de la salida (caso reportado)', () => {
    const err = getAttendanceMarksValidationError({
      check_in: '2026-08-06T16:21:00.000Z',
      check_out: '2026-08-06T20:00:00.000Z',
      lunch_start: '2026-08-06T23:54:00.000Z',
      lunch_end: '2026-08-07T04:14:00.000Z',
    })
    assert.ok(err)
    assert.match(err!, /almuerzo debe quedar entre/i)
  })

  it('rechaza almuerzo incompleto', () => {
    const err = getAttendanceMarksValidationError({
      check_in: '2026-08-06T16:21:00.000Z',
      check_out: '2026-08-06T20:00:00.000Z',
      lunch_start: '2026-08-06T18:00:00.000Z',
      lunch_end: null,
    })
    assert.match(err!, /inicio y fin de almuerzo/i)
  })

  it('rechaza salida antes de entrada', () => {
    const err = getAttendanceMarksValidationError({
      check_in: '2026-08-06T20:00:00.000Z',
      check_out: '2026-08-06T16:00:00.000Z',
      lunch_start: null,
      lunch_end: null,
    })
    assert.match(err!, /salida debe ser posterior/i)
  })
})

describe('humanizeAttendanceHoursCalcError', () => {
  it('traduce constraint de horas negativas', () => {
    const msg = humanizeAttendanceHoursCalcError(
      'new row for relation "attendance_hours_calculation" violates check constraint "attendance_hours_calculation_normal_hours_non_negative"'
    )
    assert.match(msg, /horas resultantes serían negativas/i)
  })
})
