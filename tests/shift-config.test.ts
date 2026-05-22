import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  applyDayBooleanState,
  buildSchedulePayload,
  dayFormStateToUiConfig,
  computeExpectedMinutesForDay,
  computeDayOffMask,
  createDefaultScheduleFormState,
  legacyScheduleToShiftConfig,
  resolveImplicitBreakMinutes,
  shiftConfigToFormState,
  shiftConfigToLegacyColumns,
  validateScheduleForm,
  weekFormToShiftConfig,
  type ContinuousDayConfig,
  type SplitDayConfig,
} from '../lib/attendance/shift-config'
import { getExpectedScheduledMinutes } from '../lib/attendance/calculate-hours'

describe('shift-config', () => {
  it('builds continuous day config from form', () => {
    const form = createDefaultScheduleFormState()
    form.name = 'Horario A'
    const config = weekFormToShiftConfig(form)
    assert.deepEqual(config.monday, {
      type: 'continuous',
      start: '08:00',
      end: '17:00',
      break: 60,
    })
    assert.deepEqual(config.saturday, { type: 'off' })
  })

  it('builds split day config from form', () => {
    const form = createDefaultScheduleFormState()
    form.days.tuesday = {
      ...form.days.tuesday,
      is_split_shift: true,
      m_start: '11:00',
      m_end: '14:00',
      a_start: '18:00',
      a_end: '21:00',
    }
    const config = weekFormToShiftConfig(form)
    assert.deepEqual(config.tuesday, {
      type: 'split',
      m_start: '11:00',
      m_end: '14:00',
      a_start: '18:00',
      a_end: '21:00',
    })
  })

  it('computes expected minutes for split shift', () => {
    const day: SplitDayConfig = {
      type: 'split',
      m_start: '11:00',
      m_end: '14:00',
      a_start: '18:00',
      a_end: '21:00',
    }
    assert.equal(computeExpectedMinutesForDay(day, 60), 3 * 60 + 3 * 60)
  })

  it('computes expected minutes for continuous shift minus break', () => {
    const day: ContinuousDayConfig = {
      type: 'continuous',
      start: '09:00',
      end: '17:00',
      break: 60,
    }
    assert.equal(computeExpectedMinutesForDay(day, 60), 7 * 60)
  })

  it('returns zero expected minutes for day off', () => {
    assert.equal(computeExpectedMinutesForDay({ type: 'off' }, 60), 0)
  })

  it('uses split gap as implicit break', () => {
    const day: SplitDayConfig = {
      type: 'split',
      m_start: '11:00',
      m_end: '14:00',
      a_start: '18:00',
      a_end: '21:00',
    }
    assert.equal(resolveImplicitBreakMinutes(day, 60), 4 * 60)
  })

  it('syncs legacy columns for backward compatibility', () => {
    const form = createDefaultScheduleFormState()
    form.days.monday.is_split_shift = true
    form.days.monday.m_start = '08:00'
    form.days.monday.m_end = '12:00'
    form.days.monday.a_start = '13:00'
    form.days.monday.a_end = '17:00'
    const payload = buildSchedulePayload(form)
    assert.equal(payload.monday_start, '08:00')
    assert.equal(payload.monday_end, '17:00')
    assert.equal(payload.day_off_mask, computeDayOffMask(payload.shift_config))
  })

  it('includes tolerance fields in schedule payload with defaults', () => {
    const form = createDefaultScheduleFormState()
    form.name = 'Horario tolerancias'
    const payload = buildSchedulePayload(form)
    assert.equal(payload.late_grace_minutes, 5)
    assert.equal(payload.late_absent_minutes, 60)
    assert.equal(payload.early_grace_minutes, 5)
    assert.equal(payload.early_absent_minutes, 60)
  })

  it('hydrates tolerance fields when loading existing schedule row', () => {
    const form = shiftConfigToFormState({
      name: 'Existente',
      break_duration: 45,
      late_grace_minutes: 10,
      late_absent_minutes: 90,
      early_grace_minutes: 15,
      early_absent_minutes: 45,
      monday_start: '09:00',
      monday_end: '18:00',
    })
    assert.equal(form.late_grace_minutes, 10)
    assert.equal(form.late_absent_minutes, 90)
    assert.equal(form.early_grace_minutes, 15)
    assert.equal(form.early_absent_minutes, 45)
  })

  it('migrates legacy rows without shift_config', () => {
    const config = legacyScheduleToShiftConfig({
      monday_start: '09:00',
      monday_end: '17:00',
      saturday_start: null,
      saturday_end: null,
      break_duration: 45,
    })
    assert.equal(config.monday?.type, 'continuous')
    assert.equal((config.monday as ContinuousDayConfig).break, 45)
    assert.equal(config.saturday?.type, 'off')
  })

  it('forces is_split_shift false when is_day_off is true', () => {
    const day = createDefaultScheduleFormState().days.tuesday
    const splitDay = applyDayBooleanState(day, { is_split_shift: true })
    assert.equal(splitDay.is_split_shift, true)

    const dayOff = applyDayBooleanState(splitDay, { is_day_off: true })
    assert.equal(dayOff.is_day_off, true)
    assert.equal(dayOff.is_split_shift, false)
  })

  it('serializes day UI config JSON shape', () => {
    const form = createDefaultScheduleFormState()
    form.days.tuesday.is_split_shift = true
    assert.deepEqual(dayFormStateToUiConfig('tuesday', form.days.tuesday), {
      day: 'Martes',
      is_day_off: false,
      is_split_shift: true,
    })
  })

  it('validates split shift afternoon after morning', () => {
    const form = createDefaultScheduleFormState()
    form.name = 'Test'
    form.days.monday.is_split_shift = true
    form.days.monday.m_end = '14:00'
    form.days.monday.a_start = '13:00'
    assert.match(validateScheduleForm(form) ?? '', /tarde/)
  })

  it('getExpectedScheduledMinutes reads shift_config', () => {
    const schedule = shiftConfigToLegacyColumns(
      {
        wednesday: { type: 'continuous', start: '09:00', end: '17:00', break: 60 },
      },
      60
    )
    schedule.shift_config = {
      wednesday: { type: 'continuous', start: '09:00', end: '17:00', break: 60 },
    }
    assert.equal(getExpectedScheduledMinutes(schedule, '2026-05-20'), 7 * 60)
  })
})
