import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { mapPunchesToDay } from '../lib/attendance/punch-mapping'
import {
  applyCorrectedMarkFields,
  buildApprovedAttendancePatch,
  composeCorrectionTimestamps,
  formatCorrectionMarkDisplay,
  getCorrectionDateAnchorError,
  localDateOfIso,
  statusFromAttendanceMarks,
} from '../lib/attendance/correction-marks'

describe('composeCorrectionTimestamps', () => {
  it('ancla 11:00 HN al date (no al año del browser)', () => {
    const marks = composeCorrectionTimestamps({
      date: '2026-08-25',
      checkInTime: '11:00',
    })
    assert.equal(marks.check_in, '2026-08-25T17:00:00.000Z')
    assert.equal(localDateOfIso(marks.check_in), '2026-08-25')
  })

  it('salida menor que entrada persiste en date+1', () => {
    const marks = composeCorrectionTimestamps({
      date: '2026-08-25',
      checkInTime: '22:00',
      checkOutTime: '06:00',
    })
    assert.equal(marks.check_in, '2026-08-26T04:00:00.000Z')
    assert.equal(marks.check_out, '2026-08-26T12:00:00.000Z')
    assert.equal(localDateOfIso(marks.check_out), '2026-08-26')
  })
})

describe('getCorrectionDateAnchorError', () => {
  it('rechaza entrada de otro año', () => {
    const err = getCorrectionDateAnchorError({
      date: '2026-08-25',
      check_in: '2025-08-25T17:00:00.000Z',
    })
    assert.match(err ?? '', /debe corresponder al día 2026-08-25/)
  })

  it('acepta salida en date+1', () => {
    const err = getCorrectionDateAnchorError({
      date: '2026-08-25',
      check_in: '2026-08-26T04:00:00.000Z',
      check_out: '2026-08-26T12:00:00.000Z',
    })
    // check_in 22:00 HN 25th = 04:00 UTC 26th → local date 2026-08-25
    assert.equal(localDateOfIso('2026-08-26T04:00:00.000Z'), '2026-08-25')
    assert.equal(err, null)
  })

  it('acepta entrada del mismo día', () => {
    const err = getCorrectionDateAnchorError({
      date: '2026-08-25',
      check_in: '2026-08-25T17:00:00.000Z',
    })
    assert.equal(err, null)
  })
})

describe('buildApprovedAttendancePatch', () => {
  it('recalcula late_minutes y no deja ausente si hay check_in', () => {
    const patch = buildApprovedAttendancePatch({
      existing: {
        check_in: '2026-08-25T17:20:24.000Z',
        check_out: null,
        lunch_start: null,
        lunch_end: null,
        flags: { punch_count: 1, late_minutes: 20 },
      },
      proposed: { proposed_check_in: '2026-08-25T17:00:00.000Z' },
      expectedStart: '11:00',
      shiftType: 'normal',
    })
    assert.equal(patch.marks.check_in, '2026-08-25T17:00:00.000Z')
    assert.equal(patch.status, 'partial')
    assert.notEqual(patch.status, 'absent')
    assert.equal(patch.late_minutes, 0)
    assert.equal(patch.expected_check_in, '11:00:00')
    assert.deepEqual(patch.corrected_fields, ['check_in'])
  })

  it('marca tarde cuando la hora corregida llega después del esperado', () => {
    const patch = buildApprovedAttendancePatch({
      existing: { check_in: '2026-08-25T17:00:00.000Z', check_out: null, flags: {} },
      proposed: { proposed_check_in: '2026-08-25T17:40:00.000Z' },
      expectedStart: '11:00',
      shiftType: 'normal',
    })
    assert.equal(patch.late_minutes, 40)
    assert.ok(patch.late_minutes > 5)
    assert.equal(statusFromAttendanceMarks(patch.marks), 'partial')
  })
})

describe('applyCorrectedMarkFields + daily-close', () => {
  it('no pisa check_in corregido con el punch; sí llena check_out', () => {
    const punchIn = '2026-08-25T17:20:24.000Z'
    const punchOut = '2026-08-25T23:00:00.000Z'
    const mapped = mapPunchesToDay([punchIn, punchOut], 'STRICT_4')
    const existing = {
      check_in: '2026-08-25T17:00:00.000Z',
      check_out: null,
      lunch_start: null,
      lunch_end: null,
    }
    const merged = applyCorrectedMarkFields(mapped, existing, { corrected_fields: ['check_in'] })
    assert.equal(merged.check_in, '2026-08-25T17:00:00.000Z')
    assert.equal(merged.check_out, punchOut)
    assert.notEqual(merged.check_in, punchIn)
    assert.equal(statusFromAttendanceMarks(merged), 'present')
  })
})

describe('formatCorrectionMarkDisplay', () => {
  it('muestra hora HN y +1 si cruza medianoche', () => {
    assert.equal(formatCorrectionMarkDisplay('2026-08-25T17:00:00.000Z', '2026-08-25'), '11:00')
    assert.equal(formatCorrectionMarkDisplay('2026-08-26T12:00:00.000Z', '2026-08-25'), '06:00 (+1)')
  })
})
