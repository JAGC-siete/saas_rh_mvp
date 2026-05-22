/**
 * Flexible work schedule topology: day off, continuous, or split shift per weekday.
 * Backward-compatible with legacy monday_start / monday_end columns.
 */

export const DAY_KEYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const

export type DayKey = (typeof DAY_KEYS)[number]

/** Spanish labels for UI / JSON `day` field */
export const DAY_LABELS_ES: Record<DayKey, string> = {
  monday: 'Lunes',
  tuesday: 'Martes',
  wednesday: 'Miércoles',
  thursday: 'Jueves',
  friday: 'Viernes',
  saturday: 'Sábado',
  sunday: 'Domingo',
}

/** 0 = Sunday … 6 = Saturday (matches JS Date.getUTCDay) */
export const DOW_TO_DAY_KEY: readonly DayKey[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
]

export type ShiftDayType = 'off' | 'continuous' | 'split'

export type ContinuousDayConfig = {
  type: 'continuous'
  start: string
  end: string
  break?: number | null
}

export type SplitDayConfig = {
  type: 'split'
  m_start: string
  m_end: string
  a_start: string
  a_end: string
}

export type OffDayConfig = {
  type: 'off'
}

export type ShiftDayConfig = ContinuousDayConfig | SplitDayConfig | OffDayConfig

export type WeekShiftConfig = Partial<Record<DayKey, ShiftDayConfig>>

export type LegacyScheduleColumns = {
  monday_start?: string | null
  monday_end?: string | null
  tuesday_start?: string | null
  tuesday_end?: string | null
  wednesday_start?: string | null
  wednesday_end?: string | null
  thursday_start?: string | null
  thursday_end?: string | null
  friday_start?: string | null
  friday_end?: string | null
  saturday_start?: string | null
  saturday_end?: string | null
  sunday_start?: string | null
  sunday_end?: string | null
  break_duration?: number | null
  shift_config?: WeekShiftConfig | null
  day_off_mask?: number | null
}

/** Per-day UI state booleans (mirrors JSON sent to/from the editor). */
export type DayUiConfig = {
  day: string
  is_day_off: boolean
  is_split_shift: boolean
}

export type DayFormState = {
  is_day_off: boolean
  is_split_shift: boolean
  /** Entrada 1 (jornada continua) */
  start: string
  /** Salida 1 (jornada continua) */
  end: string
  breakMinutes: string
  /** Entrada 1 (turno partido) */
  m_start: string
  /** Salida 1 (turno partido) */
  m_end: string
  /** Entrada 2 (turno partido) */
  a_start: string
  /** Salida 2 (turno partido) */
  a_end: string
}

export type ScheduleEditorFormState = {
  name: string
  break_duration: number
  timezone: string
  late_grace_minutes: number
  late_absent_minutes: number
  early_grace_minutes: number
  early_absent_minutes: number
  days: Record<DayKey, DayFormState>
}

export type ScheduleToleranceFields = {
  late_grace_minutes?: number | null
  late_absent_minutes?: number | null
  early_grace_minutes?: number | null
  early_absent_minutes?: number | null
}

export type ScheduleToleranceValues = {
  late_grace_minutes: number
  late_absent_minutes: number
  early_grace_minutes: number
  early_absent_minutes: number
}

export const DEFAULT_SCHEDULE_TOLERANCE: ScheduleToleranceValues = {
  late_grace_minutes: 5,
  late_absent_minutes: 60,
  early_grace_minutes: 5,
  early_absent_minutes: 60,
}

function toleranceFromRow(row: ScheduleToleranceFields): ScheduleToleranceValues {
  return {
    late_grace_minutes: row.late_grace_minutes ?? DEFAULT_SCHEDULE_TOLERANCE.late_grace_minutes,
    late_absent_minutes: row.late_absent_minutes ?? DEFAULT_SCHEDULE_TOLERANCE.late_absent_minutes,
    early_grace_minutes: row.early_grace_minutes ?? DEFAULT_SCHEDULE_TOLERANCE.early_grace_minutes,
    early_absent_minutes: row.early_absent_minutes ?? DEFAULT_SCHEDULE_TOLERANCE.early_absent_minutes,
  }
}

const DEFAULT_CONTINUOUS: Pick<DayFormState, 'start' | 'end'> = {
  start: '08:00',
  end: '17:00',
}

export function createDefaultDayFormState(overrides?: Partial<DayFormState>): DayFormState {
  return {
    is_day_off: false,
    is_split_shift: false,
    start: DEFAULT_CONTINUOUS.start,
    end: DEFAULT_CONTINUOUS.end,
    breakMinutes: '',
    m_start: '08:00',
    m_end: '13:00',
    a_start: '14:00',
    a_end: '18:00',
    ...overrides,
  }
}

/** JSON representation of a day row in the schedule editor UI. */
export function dayFormStateToUiConfig(dayKey: DayKey, day: DayFormState): DayUiConfig {
  return {
    day: DAY_LABELS_ES[dayKey],
    is_day_off: day.is_day_off,
    is_split_shift: day.is_split_shift,
  }
}

/**
 * Apply boolean toggles with partial mutual exclusion:
 * if is_day_off is true, is_split_shift is forced to false.
 */
export function applyDayBooleanState(
  day: DayFormState,
  patch: Partial<Pick<DayUiConfig, 'is_day_off' | 'is_split_shift'>>
): DayFormState {
  const is_day_off = patch.is_day_off ?? day.is_day_off
  let is_split_shift = patch.is_split_shift ?? day.is_split_shift

  if (is_day_off) {
    is_split_shift = false
  }

  return { ...day, is_day_off, is_split_shift }
}

export function createDefaultScheduleFormState(): ScheduleEditorFormState {
  const days = {} as Record<DayKey, DayFormState>
  for (const key of DAY_KEYS) {
    if (key === 'saturday' || key === 'sunday') {
      days[key] = createDefaultDayFormState({ is_day_off: true, start: '', end: '' })
    } else {
      days[key] = createDefaultDayFormState()
    }
  }
  return {
    name: '',
    break_duration: 60,
    timezone: 'America/Tegucigalpa',
    ...DEFAULT_SCHEDULE_TOLERANCE,
    days,
  }
}

export function normalizeTimeValue(value: string | null | undefined): string {
  if (!value || typeof value !== 'string') return ''
  const trimmed = value.trim()
  if (!trimmed) return ''
  const parts = trimmed.split(':')
  if (parts.length < 2) return trimmed
  const [h, m] = parts
  return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`
}

export function timeToMinutes(timeStr: string | null | undefined): number | null {
  const normalized = normalizeTimeValue(timeStr)
  if (!normalized) return null
  const [h, m] = normalized.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  return h * 60 + m
}

function minutesSpan(start: string, end: string): number {
  const s = timeToMinutes(start)
  const e = timeToMinutes(end)
  if (s === null || e === null) return 0
  if (e >= s) return e - s
  return 24 * 60 - s + e
}

export function dayKeyFromDate(dateStr: string): DayKey {
  const d = new Date(`${dateStr}T12:00:00.000Z`)
  return DOW_TO_DAY_KEY[d.getUTCDay()]
}

export function computeDayOffMask(config: WeekShiftConfig): number {
  let mask = 0
  for (let dow = 0; dow < 7; dow++) {
    const key = DOW_TO_DAY_KEY[dow]
    const day = config[key]
    if (day?.type === 'off') {
      mask |= 1 << dow
    }
  }
  return mask
}

export function isDayOffMask(mask: number, dow: number): boolean {
  return (mask & (1 << dow)) !== 0
}

export function dayFormToConfig(day: DayFormState, globalBreak: number): ShiftDayConfig {
  if (day.is_day_off) return { type: 'off' }
  if (day.is_split_shift) {
    return {
      type: 'split',
      m_start: normalizeTimeValue(day.m_start),
      m_end: normalizeTimeValue(day.m_end),
      a_start: normalizeTimeValue(day.a_start),
      a_end: normalizeTimeValue(day.a_end),
    }
  }
  const breakVal = day.breakMinutes.trim() === '' ? null : Number(day.breakMinutes)
  return {
    type: 'continuous',
    start: normalizeTimeValue(day.start),
    end: normalizeTimeValue(day.end),
    break: breakVal != null && !Number.isNaN(breakVal) ? breakVal : globalBreak,
  }
}

export function weekFormToShiftConfig(form: ScheduleEditorFormState): WeekShiftConfig {
  const out: WeekShiftConfig = {}
  for (const key of DAY_KEYS) {
    out[key] = dayFormToConfig(form.days[key], form.break_duration)
  }
  return out
}

export function shiftConfigToLegacyColumns(
  config: WeekShiftConfig,
  globalBreak: number
): LegacyScheduleColumns {
  const legacy: LegacyScheduleColumns = { break_duration: globalBreak }
  for (const key of DAY_KEYS) {
    const day = config[key]
    const startKey = `${key}_start` as keyof LegacyScheduleColumns
    const endKey = `${key}_end` as keyof LegacyScheduleColumns

    if (!day || day.type === 'off') {
      ;(legacy as Record<string, string | null>)[startKey] = null
      ;(legacy as Record<string, string | null>)[endKey] = null
      continue
    }

    if (day.type === 'split') {
      ;(legacy as Record<string, string | null>)[startKey] = day.m_start || null
      ;(legacy as Record<string, string | null>)[endKey] = day.a_end || null
      continue
    }

    ;(legacy as Record<string, string | null>)[startKey] = day.start || null
    ;(legacy as Record<string, string | null>)[endKey] = day.end || null
  }
  return legacy
}

export function legacyScheduleToShiftConfig(row: LegacyScheduleColumns): WeekShiftConfig {
  if (row.shift_config && typeof row.shift_config === 'object' && Object.keys(row.shift_config).length > 0) {
    return row.shift_config
  }

  const globalBreak = row.break_duration ?? 60
  const config: WeekShiftConfig = {}

  for (const key of DAY_KEYS) {
    const start = normalizeTimeValue(row[`${key}_start` as keyof LegacyScheduleColumns] as string | null)
    const end = normalizeTimeValue(row[`${key}_end` as keyof LegacyScheduleColumns] as string | null)

    if (!start && !end) {
      config[key] = { type: 'off' }
    } else {
      config[key] = {
        type: 'continuous',
        start: start || '08:00',
        end: end || '17:00',
        break: globalBreak,
      }
    }
  }

  return config
}

export function shiftConfigToFormState(
  row: LegacyScheduleColumns & ScheduleToleranceFields & { name?: string; timezone?: string | null },
  base?: ScheduleEditorFormState
): ScheduleEditorFormState {
  const config = legacyScheduleToShiftConfig(row)
  const form = base ?? createDefaultScheduleFormState()

  form.name = row.name ?? form.name
  form.break_duration = row.break_duration ?? 60
  form.timezone = row.timezone ?? form.timezone
  Object.assign(form, toleranceFromRow(row))

  for (const key of DAY_KEYS) {
    const day = config[key]
    if (!day || day.type === 'off') {
      form.days[key] = createDefaultDayFormState({ is_day_off: true, start: '', end: '' })
      continue
    }
    if (day.type === 'split') {
      form.days[key] = createDefaultDayFormState({
        is_split_shift: true,
        m_start: day.m_start,
        m_end: day.m_end,
        a_start: day.a_start,
        a_end: day.a_end,
      })
      continue
    }
    form.days[key] = createDefaultDayFormState({
      start: day.start,
      end: day.end,
      breakMinutes: day.break != null && day.break !== form.break_duration ? String(day.break) : '',
    })
  }

  return form
}

export function getDayConfig(
  schedule: LegacyScheduleColumns,
  dayKey: DayKey
): ShiftDayConfig {
  const config = legacyScheduleToShiftConfig(schedule)
  return config[dayKey] ?? { type: 'off' }
}

export function getDayConfigForDate(schedule: LegacyScheduleColumns, dateStr: string): ShiftDayConfig {
  return getDayConfig(schedule, dayKeyFromDate(dateStr))
}

/** Expected paid minutes for a day per schedule topology (not from punches). */
export function computeExpectedMinutesForDay(
  day: ShiftDayConfig | undefined,
  globalBreak: number
): number {
  if (!day || day.type === 'off') return 0
  if (day.type === 'split') {
    return minutesSpan(day.m_start, day.m_end) + minutesSpan(day.a_start, day.a_end)
  }
  const breakMin = day.break ?? globalBreak
  return Math.max(0, minutesSpan(day.start, day.end) - breakMin)
}

export function computeExpectedMinutesForDate(
  schedule: LegacyScheduleColumns,
  dateStr: string
): number {
  const dayKey = dayKeyFromDate(dateStr)
  const config = legacyScheduleToShiftConfig(schedule)
  return computeExpectedMinutesForDay(config[dayKey], schedule.break_duration ?? 60)
}

/** Break minutes to subtract when no lunch punches exist (split → gap between blocks). */
export function resolveImplicitBreakMinutes(
  day: ShiftDayConfig | undefined,
  globalBreak: number
): number {
  if (!day || day.type === 'off') return 0
  if (day.type === 'split') {
    const gap = minutesSpan(day.m_end, day.a_start)
    return gap > 0 ? gap : 0
  }
  return day.break ?? globalBreak
}

export function formatDayConfigSummary(day: ShiftDayConfig | undefined): string {
  if (!day || day.type === 'off') return 'Libre'
  if (day.type === 'split') {
    return `${day.m_start}–${day.m_end} / ${day.a_start}–${day.a_end}`
  }
  const breakNote = day.break != null ? ` (−${day.break}m)` : ''
  return `${day.start}–${day.end}${breakNote}`
}

export function buildSchedulePayload(form: ScheduleEditorFormState) {
  const shift_config = weekFormToShiftConfig(form)
  const day_off_mask = computeDayOffMask(shift_config)
  const legacy = shiftConfigToLegacyColumns(shift_config, form.break_duration)

  return {
    name: form.name.trim(),
    break_duration: form.break_duration,
    timezone: form.timezone,
    late_grace_minutes: form.late_grace_minutes,
    late_absent_minutes: form.late_absent_minutes,
    early_grace_minutes: form.early_grace_minutes,
    early_absent_minutes: form.early_absent_minutes,
    shift_config,
    day_off_mask,
    ...legacy,
  }
}

export function validateScheduleForm(form: ScheduleEditorFormState): string | null {
  if (!form.name.trim()) return 'El nombre del horario es obligatorio.'

  for (const key of DAY_KEYS) {
    const day = form.days[key]
    const label = key.charAt(0).toUpperCase() + key.slice(1)
    if (day.is_day_off) continue

    if (day.is_split_shift) {
      const fields = [day.m_start, day.m_end, day.a_start, day.a_end]
      if (fields.some((f) => !normalizeTimeValue(f))) {
        return `${label}: complete las 4 horas del turno partido.`
      }
      const mEnd = timeToMinutes(day.m_end)
      const aStart = timeToMinutes(day.a_start)
      if (mEnd !== null && aStart !== null && aStart <= mEnd) {
        return `${label}: la entrada de tarde debe ser posterior a la salida de mañana.`
      }
      continue
    }

    if (!normalizeTimeValue(day.start) || !normalizeTimeValue(day.end)) {
      return `${label}: indique entrada y salida.`
    }
  }

  return null
}
