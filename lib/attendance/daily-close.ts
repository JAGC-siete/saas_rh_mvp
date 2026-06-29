import type { BiometricMode } from './attendance-metadata'
import { getResolvedAttendanceConfig } from './attendance-metadata'
import { mapPunchesToDay } from './punch-mapping'

export { mapPunchesToDay } from './punch-mapping'
export { PUNCH_ANOMALY_TYPES, formatPunchAnomalyLabel } from './punch-mapping'
export type { MappedPunchDay, PunchAnomalyType } from './punch-mapping'
import { DateTime } from 'luxon'
import { getScheduleTimesForDate, isRestDayForDate } from './schedule-times'
import type { LegacyScheduleColumns } from './shift-config'
import {
  loadEmployeeScheduleAssignments,
  resolveEffectiveWorkScheduleIdFromAssignments,
} from './resolve-schedule-batch'

/** super_admin must pass explicit company_id (query/body). */
export function resolveCompanyIdForDailyClose(
  role: string,
  profileCompanyId: string | null,
  explicitCompanyId: string | undefined | null
): string | null {
  if (role === 'super_admin') {
    return explicitCompanyId && typeof explicitCompanyId === 'string' ? explicitCompanyId : null
  }
  return profileCompanyId
}

export const RAW_PUNCH_EVENT_TYPE = 'raw_punch'

export type DailyCloseFlags = Record<string, unknown> & {
  has_anomaly?: boolean
  anomaly_types?: string[]
  biometric_mode?: BiometricMode
  punch_count?: number
  daily_close_at?: string
  daily_close_version?: number
  close_state?: 'draft' | 'finalized'
  admin_override?: boolean
  daily_close_absent?: boolean
}

export interface AttendanceEventRow {
  id: string
  employee_id: string
  ts_utc: string
  device_id: string | null
  event_type: string
  event_uid?: string | null
  local_date?: string | null
}

export interface DailyCloseEmployeeResult {
  employeeId: string
  punchCount: number
  anomalyTypes: string[]
  recordId: string | null
  skippedLocked: boolean
}

export interface GenerateDailyCloseReportResult {
  companyId: string
  localDate: string
  biometric_mode: BiometricMode
  timezone: string
  processed: number
  anomalies: number
  skipped_locked: number
  employees: DailyCloseEmployeeResult[]
}

function recordLocked(flags: unknown): boolean {
  const f = flags as DailyCloseFlags | null | undefined
  return f?.close_state === 'finalized' || f?.admin_override === true
}

function mergeFlags(
  existing: Record<string, unknown> | null | undefined,
  incoming: DailyCloseFlags
): DailyCloseFlags {
  const base = { ...(existing || {}) } as DailyCloseFlags
  if (base.close_state === 'finalized' || base.admin_override) {
    return base
  }
  const merged: DailyCloseFlags = {
    ...base,
    ...incoming,
    anomaly_types: incoming.anomaly_types ?? base.anomaly_types,
  }
  return merged
}

function tsFromEvent(e: AttendanceEventRow): string {
  return e.ts_utc
}

/**
 * Group raw biometric events by employee, apply modality, upsert attendance_records.
 */
export async function generateDailyCloseReport(params: {
  companyId: string
  localDate: string
  supabase: { from: (t: string) => any }
}): Promise<GenerateDailyCloseReportResult> {
  const { companyId, localDate, supabase } = params

  if (!/^\d{4}-\d{2}-\d{2}$/.test(localDate)) {
    throw new Error('localDate must be YYYY-MM-DD')
  }

  const { biometric_mode, timezone } = await getResolvedAttendanceConfig(supabase, companyId)

  const { data: employees, error: empErr } = await supabase
    .from('employees')
    .select('id, work_schedule_id, attendance_required')
    .eq('company_id', companyId)
    .eq('status', 'active')

  if (empErr) {
    throw new Error(`employees: ${empErr.message}`)
  }

  type DailyCloseEmployeeRow = {
    id: string
    work_schedule_id?: string | null
    attendance_required?: boolean | null
  }

  const employeeRows = (employees || []) as DailyCloseEmployeeRow[]
  const employeeIds = employeeRows.map((e) => e.id)
  const employeeById = new Map(employeeRows.map((e) => [e.id, e]))

  if (employeeIds.length === 0) {
    return {
      companyId,
      localDate,
      biometric_mode,
      timezone,
      processed: 0,
      anomalies: 0,
      skipped_locked: 0,
      employees: [],
    }
  }

  const { data: events, error: evErr } = await supabase
    .from('attendance_events')
    .select('id, employee_id, ts_utc, device_id, event_type, event_uid, local_date')
    .eq('local_date', localDate)
    .in('employee_id', employeeIds)
    .eq('event_type', RAW_PUNCH_EVENT_TYPE)
    .order('ts_utc', { ascending: true })

  if (evErr) {
    throw new Error(`attendance_events: ${evErr.message}`)
  }

  const byEmployee = new Map<string, AttendanceEventRow[]>()
  for (const e of events || []) {
    const row = e as AttendanceEventRow
    if (!byEmployee.has(row.employee_id)) byEmployee.set(row.employee_id, [])
    byEmployee.get(row.employee_id)!.push(row)
  }

  const { data: existingRecords } = await supabase
    .from('attendance_records')
    .select('id, employee_id, date, flags, check_in, check_out, lunch_start, lunch_end, status, justification')
    .eq('date', localDate)
    .in('employee_id', employeeIds)

  const recordByEmployee = new Map<string, Record<string, unknown>>()
  for (const r of existingRecords || []) {
    recordByEmployee.set((r as { employee_id: string }).employee_id, r as Record<string, unknown>)
  }

  const assignmentMap = await loadEmployeeScheduleAssignments({
    supabase,
    companyId,
    employeeIds,
    rangeFrom: localDate,
    rangeTo: localDate,
  })

  const effectiveScheduleIdByEmployee = new Map<string, string | null>()
  for (const emp of employeeRows) {
    const eff = resolveEffectiveWorkScheduleIdFromAssignments({
      assignments: assignmentMap.get(emp.id) || [],
      date: localDate,
      fallbackWorkScheduleId: emp.work_schedule_id,
    })
    effectiveScheduleIdByEmployee.set(emp.id, eff.found ? eff.workScheduleId : null)
  }

  const scheduleIds = Array.from(
    new Set(
      [...effectiveScheduleIdByEmployee.values()].filter((x): x is string => typeof x === 'string' && x.length > 0)
    )
  )
  const scheduleById = new Map<string, WorkScheduleRow>()
  if (scheduleIds.length > 0) {
    const { data: schedData } = await supabase
      .from('work_schedules')
      .select(
        'id, monday_start, monday_end, tuesday_start, tuesday_end, wednesday_start, wednesday_end, thursday_start, thursday_end, friday_start, friday_end, saturday_start, saturday_end, sunday_start, sunday_end, shift_config, break_duration'
      )
      .in('id', scheduleIds)
    for (const s of (schedData || []) as WorkScheduleRow[]) {
      scheduleById.set(s.id, s)
    }
  }

  const results: DailyCloseEmployeeResult[] = []
  let anomalies = 0
  let skipped_locked = 0
  let processed = 0
  const nowIso = new Date().toISOString()

  for (const employeeId of employeeIds) {
    const evs = byEmployee.get(employeeId) || []
    const punches = evs.map(tsFromEvent)
    const existing = recordByEmployee.get(employeeId)

    if (existing && recordLocked(existing.flags)) {
      // Even if the record is locked/finalized, we can still attach raw punches
      // for auditability (does not mutate attendance_records).
      if (evs.length > 0 && existing.id) {
        await supabase
          .from('attendance_events')
          .update({ ref_record_id: existing.id })
          .eq('employee_id', employeeId)
          .eq('local_date', localDate)
          .eq('event_type', RAW_PUNCH_EVENT_TYPE)
          .is('ref_record_id', null)
      }
      skipped_locked++
      results.push({
        employeeId,
        punchCount: punches.length,
        anomalyTypes: [],
        recordId: existing.id as string,
        skippedLocked: true,
      })
      continue
    }

    if (punches.length === 0) {
      const emp = employeeById.get(employeeId)
      if (emp?.attendance_required === false) {
        results.push({
          employeeId,
          punchCount: 0,
          anomalyTypes: [],
          recordId: (existing?.id as string) || null,
          skippedLocked: false,
        })
        continue
      }

      if (existing?.check_in) {
        results.push({
          employeeId,
          punchCount: 0,
          anomalyTypes: [],
          recordId: existing.id as string,
          skippedLocked: false,
        })
        continue
      }

      const effectiveScheduleId = effectiveScheduleIdByEmployee.get(employeeId) ?? null
      const schedule = effectiveScheduleId ? scheduleById.get(effectiveScheduleId) ?? null : null
      const isWorkDay = schedule ? !isRestDayForDate(schedule, localDate) : false

      if (!isWorkDay) {
        results.push({
          employeeId,
          punchCount: 0,
          anomalyTypes: [],
          recordId: (existing?.id as string) || null,
          skippedLocked: false,
        })
        continue
      }

      const prevVersion =
        typeof (existing?.flags as DailyCloseFlags | undefined)?.daily_close_version === 'number'
          ? ((existing?.flags as DailyCloseFlags).daily_close_version as number)
          : 0

      const absentFlags: DailyCloseFlags = mergeFlags(existing?.flags as Record<string, unknown> | undefined, {
        has_anomaly: false,
        anomaly_types: [],
        biometric_mode,
        punch_count: 0,
        daily_close_at: nowIso,
        daily_close_version: prevVersion + 1,
        daily_close_absent: true,
      })

      const absentRow = {
        employee_id: employeeId,
        date: localDate,
        check_in: null,
        check_out: null,
        lunch_start: null,
        lunch_end: null,
        status: 'absent',
        flags: absentFlags,
        tz: timezone,
        tz_offset_minutes: -360,
        updated_at: nowIso,
      }

      const { data: upsertedAbsent, error: absentErr } = await supabase
        .from('attendance_records')
        .upsert(absentRow, { onConflict: 'employee_id,date' })
        .select('id')
        .maybeSingle()

      if (absentErr) {
        throw new Error(`upsert absent attendance_records: ${absentErr.message}`)
      }

      processed++
      results.push({
        employeeId,
        punchCount: 0,
        anomalyTypes: [],
        recordId: upsertedAbsent?.id ?? (existing?.id as string) || null,
        skippedLocked: false,
      })
      continue
    }

    const mapped = mapPunchesToDay(punches, biometric_mode)
    const hasAnomaly = mapped.anomalyTypes.length > 0
    if (hasAnomaly) anomalies++

    const prevVersion =
      typeof (existing?.flags as DailyCloseFlags | undefined)?.daily_close_version === 'number'
        ? ((existing?.flags as DailyCloseFlags).daily_close_version as number)
        : 0

    const closeFlags: DailyCloseFlags = mergeFlags(existing?.flags as Record<string, unknown> | undefined, {
      has_anomaly: hasAnomaly,
      anomaly_types: mapped.anomalyTypes,
      biometric_mode,
      punch_count: punches.length,
      daily_close_at: nowIso,
      daily_close_version: prevVersion + 1,
    })

    const row = {
      employee_id: employeeId,
      date: localDate,
      check_in: mapped.check_in,
      check_out: mapped.check_out,
      lunch_start: mapped.lunch_start,
      lunch_end: mapped.lunch_end,
      status: mapped.status,
      flags: closeFlags,
      tz: timezone,
      tz_offset_minutes: -360,
      updated_at: nowIso,
    }

    const { data: upserted, error: upErr } = await supabase
      .from('attendance_records')
      .upsert(row, { onConflict: 'employee_id,date' })
      .select('id')
      .maybeSingle()

    if (upErr) {
      throw new Error(`upsert attendance_records: ${upErr.message}`)
    }

    // Backfill linkage for immutable raw punches -> produced record.
    // This is idempotent (only fills NULL ref_record_id).
    if (upserted?.id) {
      await supabase
        .from('attendance_events')
        .update({ ref_record_id: upserted.id })
        .eq('employee_id', employeeId)
        .eq('local_date', localDate)
        .eq('event_type', RAW_PUNCH_EVENT_TYPE)
        .is('ref_record_id', null)
    }

    processed++
    results.push({
      employeeId,
      punchCount: punches.length,
      anomalyTypes: mapped.anomalyTypes,
      recordId: upserted?.id ?? null,
      skippedLocked: false,
    })
  }

  return {
    companyId,
    localDate,
    biometric_mode,
    timezone,
    processed,
    anomalies,
    skipped_locked,
    employees: results,
  }
}

export interface DailyCloseReportItem {
  employee: {
    id: string
    name: string
    department_id: string | null
    employee_code?: string | null
    role?: string | null
    team?: string | null
  }
  bucket: 'normal' | 'anomaly'
  anomaly_types: string[]
  in_progress?: boolean
  hours?: {
    total_hours: number
    normal_hours: number
    overtime_hours: number
    overtime_diurno_hours: number
    overtime_nocturno_hours: number
    overtime_feriado_hours: number
  } | null
  events: { id: string; ts_utc: string; device_id: string | null }[]
  record: Record<string, unknown> | null
}

function removeMissingPunchWhenInProgress(anomalyTypes: string[], inProgress: boolean): string[] {
  if (!inProgress || anomalyTypes.length === 0) return anomalyTypes
  return anomalyTypes.filter((t) => t !== 'missing_punch')
}

type WorkScheduleRow = LegacyScheduleColumns & { id: string }

function getScheduleEndForDate(schedule: WorkScheduleRow | null, localDate: string, zone: string): string | null {
  if (!schedule) return null
  const times = getScheduleTimesForDate(schedule, localDate)
  return times.end
}

function getScheduleStartForDate(schedule: WorkScheduleRow | null, localDate: string): string | null {
  if (!schedule) return null
  return getScheduleTimesForDate(schedule, localDate).start
}

function parseTimeToMinutes(t: string | null): number | null {
  if (!t) return null
  const parts = t.split(':').map((x) => parseInt(x, 10))
  if (parts.length < 2) return null
  const [h, m] = parts
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  return h * 60 + m
}

function computeInProgress(params: {
  localDate: string
  zone: string
  schedule: WorkScheduleRow | null
  toleranceMinutes: number
}): boolean {
  const { localDate, zone, schedule, toleranceMinutes } = params
  const now = DateTime.now().setZone(zone)
  const today = now.toISODate()
  if (!today || today !== localDate) return false
  if (!schedule) return false

  const { start, end } = { start: getScheduleStartForDate(schedule, localDate), end: getScheduleEndForDate(schedule, localDate, zone) }
  const endMin = parseTimeToMinutes(end)
  if (endMin == null) return false
  const startMin = parseTimeToMinutes(start)
  const crossesMidnight = startMin != null ? endMin <= startMin : false

  const base = DateTime.fromISO(localDate, { zone })
  if (!base.isValid) return false
  const endDt = base
    .set({ hour: Math.floor(endMin / 60), minute: endMin % 60, second: 0, millisecond: 0 })
    .plus({ days: crossesMidnight ? 1 : 0 })
    .plus({ minutes: toleranceMinutes })

  return now < endDt
}

/**
 * Build UI payload for GET daily-close (does not mutate).
 */
export async function buildDailyCloseReportPayload(params: {
  companyId: string
  localDate: string
  supabase: { from: (t: string) => any }
  filters?: {
    only_with_events?: boolean
    department_id?: string
    role?: string
    team?: string
    search?: string
    sort?: string
  }
}): Promise<{
  meta: { date: string; biometric_mode: BiometricMode; timezone: string }
  summary: {
    total_employees: number
    total_with_events: number
    total_anomalies: number
    total_finalized: number
  }
  items: DailyCloseReportItem[]
}> {
  const { companyId, localDate, supabase } = params
  const filters = params.filters || {}
  const { biometric_mode, timezone } = await getResolvedAttendanceConfig(supabase, companyId)
  const toleranceMinutes = 45

  const { data: employees } = await supabase
    .from('employees')
    .select('id, name, department_id, employee_code, role, team, work_schedule_id')
    .eq('company_id', companyId)
    .eq('status', 'active')
    .order('name')

  let list =
    (employees || []) as {
      id: string
      name: string
      department_id: string | null
      employee_code?: string | null
      role?: string | null
      team?: string | null
      work_schedule_id?: string | null
    }[]

  if (typeof filters.department_id === 'string' && filters.department_id.trim()) {
    const target = filters.department_id.trim()
    list = list.filter((e) => e.department_id === target)
  }
  if (typeof filters.role === 'string' && filters.role.trim()) {
    const target = filters.role.trim().toLowerCase()
    list = list.filter((e) => (e.role || '').toLowerCase() === target)
  }
  if (typeof filters.team === 'string' && filters.team.trim()) {
    const target = filters.team.trim().toLowerCase()
    list = list.filter((e) => (e.team || '').toLowerCase() === target)
  }
  if (typeof filters.search === 'string' && filters.search.trim()) {
    const q = filters.search.trim().toLowerCase()
    list = list.filter((e) => {
      const name = (e.name || '').toLowerCase()
      const code = (e.employee_code || '').toLowerCase()
      return name.includes(q) || code.includes(q)
    })
  }

  const employeeIds = list.map((e) => e.id)

  let events: { id: string; employee_id: string; ts_utc: string; device_id: string | null }[] = []
  if (employeeIds.length > 0) {
    const { data: evData } = await supabase
      .from('attendance_events')
      .select('id, employee_id, ts_utc, device_id')
      .eq('local_date', localDate)
      .in('employee_id', employeeIds)
      .in('event_type', [RAW_PUNCH_EVENT_TYPE, 'check_in', 'check_out'])
      .order('ts_utc', { ascending: true })
    events = (evData || []) as typeof events
  }

  const evByEmp = new Map<string, { id: string; ts_utc: string; device_id: string | null }[]>()
  for (const e of events) {
    if (!evByEmp.has(e.employee_id)) evByEmp.set(e.employee_id, [])
    evByEmp.get(e.employee_id)!.push({ id: e.id, ts_utc: e.ts_utc, device_id: e.device_id })
  }

  const onlyWithEvents = filters.only_with_events !== false
  if (onlyWithEvents) {
    const withEvents = new Set<string>()
    for (const e of events) withEvents.add(e.employee_id)
    list = list.filter((e) => withEvents.has(e.id))
  }

  const assignmentMap = await loadEmployeeScheduleAssignments({
    supabase,
    companyId,
    employeeIds: list.map((e) => e.id),
    rangeFrom: localDate,
    rangeTo: localDate,
  })

  const effectiveScheduleIdByEmployee = new Map<string, string | null>()
  for (const emp of list) {
    const eff = resolveEffectiveWorkScheduleIdFromAssignments({
      assignments: assignmentMap.get(emp.id) || [],
      date: localDate,
      fallbackWorkScheduleId: emp.work_schedule_id,
    })
    effectiveScheduleIdByEmployee.set(emp.id, eff.found ? eff.workScheduleId : null)
  }

  const scheduleIds = Array.from(
    new Set(
      [...effectiveScheduleIdByEmployee.values()].filter((x): x is string => typeof x === 'string' && x.length > 0)
    )
  )
  const scheduleById = new Map<string, WorkScheduleRow>()
  if (scheduleIds.length > 0) {
    const { data: schedData } = await supabase
      .from('work_schedules')
      .select(
        'id, monday_start, monday_end, tuesday_start, tuesday_end, wednesday_start, wednesday_end, thursday_start, thursday_end, friday_start, friday_end, saturday_start, saturday_end, sunday_start, sunday_end, shift_config, break_duration'
      )
      .in('id', scheduleIds)
    for (const s of (schedData || []) as WorkScheduleRow[]) {
      scheduleById.set(s.id, s)
    }
  }

  const sortKey = typeof filters.sort === 'string' ? filters.sort : ''
  if (sortKey === 'name_desc') {
    list = [...list].sort((a, b) => b.name.localeCompare(a.name))
  } else if (sortKey === 'name_asc') {
    list = [...list].sort((a, b) => a.name.localeCompare(b.name))
  }

  let records: Record<string, unknown>[] = []
  const finalEmployeeIds = list.map((e) => e.id)
  if (finalEmployeeIds.length > 0) {
    const { data: recData } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('date', localDate)
      .in('employee_id', finalEmployeeIds)
    records = (recData || []) as Record<string, unknown>[]
  }

  const recByEmp = new Map<string, Record<string, unknown>>()
  for (const r of records) {
    recByEmp.set(r.employee_id as string, r)
  }

  const recordIds = records.map((r) => r.id).filter((x): x is string => typeof x === 'string' && x.length > 0)
  const hoursByRecord = new Map<
    string,
    {
      total_hours: number
      normal_hours: number
      overtime_diurno_hours: number
      overtime_nocturno_hours: number
      overtime_feriado_hours: number
    }
  >()
  if (recordIds.length > 0) {
    const { data: ahcData } = await supabase
      .from('attendance_hours_calculation')
      .select('attendance_record_id, total_hours, normal_hours, overtime_diurno_hours, overtime_nocturno_hours, overtime_feriado_hours')
      .in('attendance_record_id', recordIds)
    for (const row of (ahcData || []) as any[]) {
      if (!row?.attendance_record_id) continue
      hoursByRecord.set(row.attendance_record_id, {
        total_hours: Number(row.total_hours || 0),
        normal_hours: Number(row.normal_hours || 0),
        overtime_diurno_hours: Number(row.overtime_diurno_hours || 0),
        overtime_nocturno_hours: Number(row.overtime_nocturno_hours || 0),
        overtime_feriado_hours: Number(row.overtime_feriado_hours || 0),
      })
    }
  }

  let total_with_events = 0
  let total_anomalies = 0
  let total_finalized = 0

  const items: DailyCloseReportItem[] = list.map((emp) => {
    const evs = evByEmp.get(emp.id) || []
    const record = recByEmp.get(emp.id) ?? null
    const punches = evs.map((x) => x.ts_utc)
    const flags = record?.flags as DailyCloseFlags | undefined
    let anomaly_types: string[] = []
    if (flags?.anomaly_types && flags.anomaly_types.length > 0) {
      anomaly_types = flags.anomaly_types
    } else if (evs.length > 0) {
      anomaly_types = mapPunchesToDay(punches, biometric_mode).anomalyTypes
    }

    const effectiveId = effectiveScheduleIdByEmployee.get(emp.id) ?? null
    const schedule = effectiveId ? (scheduleById.get(effectiveId) ?? null) : null
    const in_progress = computeInProgress({
      localDate,
      zone: timezone,
      schedule,
      toleranceMinutes,
    })

    anomaly_types = removeMissingPunchWhenInProgress(anomaly_types, in_progress)
    const bucket: 'normal' | 'anomaly' = anomaly_types.length > 0 ? 'anomaly' : 'normal'

    if (evs.length > 0) total_with_events++
    if (bucket === 'anomaly') total_anomalies++
    if (flags?.close_state === 'finalized') total_finalized++

    return {
      employee: {
        id: emp.id,
        name: emp.name,
        department_id: emp.department_id,
        employee_code: emp.employee_code ?? null,
        role: emp.role ?? null,
        team: emp.team ?? null,
      },
      bucket,
      anomaly_types,
      in_progress,
      hours: (() => {
        const rid = (record as any)?.id as string | undefined
        if (!rid) return null
        const h = hoursByRecord.get(rid)
        if (!h) return null
        const overtime_hours = h.overtime_diurno_hours + h.overtime_nocturno_hours + h.overtime_feriado_hours
        return {
          ...h,
          overtime_hours,
        }
      })(),
      events: evs,
      record,
    }
  })

  items.sort((a, b) => {
    const aBad = a.bucket === 'anomaly' ? 0 : 1
    const bBad = b.bucket === 'anomaly' ? 0 : 1
    if (aBad !== bBad) return aBad - bBad
    return a.employee.name.localeCompare(b.employee.name)
  })

  return {
    meta: { date: localDate, biometric_mode, timezone },
    summary: {
      total_employees: (employees || []).length,
      total_with_events,
      total_anomalies,
      total_finalized,
    },
    items,
  }
}
