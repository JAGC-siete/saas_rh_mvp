import type { BiometricMode } from './attendance-metadata'
import { getResolvedAttendanceConfig } from './attendance-metadata'

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

interface MappedDay {
  check_in: string | null
  check_out: string | null
  lunch_start: string | null
  lunch_end: string | null
  anomalyTypes: string[]
  status: string
}

function tsFromEvent(e: AttendanceEventRow): string {
  return e.ts_utc
}

/**
 * Map ordered punch timestamps to attendance fields + anomaly list.
 */
export function mapPunchesToDay(
  punches: string[],
  mode: BiometricMode
): MappedDay {
  const n = punches.length
  const empty = (): MappedDay => ({
    check_in: null,
    check_out: null,
    lunch_start: null,
    lunch_end: null,
    anomalyTypes: [],
    status: 'present',
  })

  if (n === 0) {
    return { ...empty(), status: 'absent', anomalyTypes: ['absent_no_punch'] }
  }

  if (mode === 'STRICT_2') {
    if (n === 1) {
      return {
        check_in: punches[0],
        check_out: null,
        lunch_start: null,
        lunch_end: null,
        anomalyTypes: ['missing_punch'],
        status: 'partial',
      }
    }
    if (n === 2) {
      return {
        check_in: punches[0],
        check_out: punches[1],
        lunch_start: null,
        lunch_end: null,
        anomalyTypes: [],
        status: 'present',
      }
    }
    return {
      check_in: punches[0],
      check_out: punches[n - 1],
      lunch_start: null,
      lunch_end: null,
      anomalyTypes: ['extra_punches'],
      status: 'present',
    }
  }

  if (mode === 'STRICT_4') {
    if (n === 4) {
      return {
        check_in: punches[0],
        lunch_start: punches[1],
        lunch_end: punches[2],
        check_out: punches[3],
        anomalyTypes: [],
        status: 'present',
      }
    }
    if (n < 4) {
      const types: string[] = ['missing_punch']
      return {
        check_in: n >= 1 ? punches[0] : null,
        lunch_start: n >= 2 ? punches[1] : null,
        lunch_end: n >= 3 ? punches[2] : null,
        check_out: n >= 4 ? punches[3] : null,
        anomalyTypes: types,
        status: 'partial',
      }
    }
    return {
      check_in: punches[0],
      lunch_start: punches[1],
      lunch_end: punches[2],
      check_out: punches[3],
      anomalyTypes: ['extra_punches'],
      status: 'present',
    }
  }

  // FLEXIBLE
  if (n === 2) {
    return {
      check_in: punches[0],
      check_out: punches[1],
      lunch_start: null,
      lunch_end: null,
      anomalyTypes: [],
      status: 'present',
    }
  }
  if (n === 4) {
    return {
      check_in: punches[0],
      lunch_start: punches[1],
      lunch_end: punches[2],
      check_out: punches[3],
      anomalyTypes: [],
      status: 'present',
    }
  }
  if (n === 1) {
    return {
      check_in: punches[0],
      check_out: null,
      lunch_start: null,
      lunch_end: null,
      anomalyTypes: ['missing_punch'],
      status: 'partial',
    }
  }
  if (n === 3) {
    return {
      check_in: punches[0],
      lunch_start: punches[1],
      lunch_end: null,
      check_out: punches[2],
      anomalyTypes: ['odd_punch_count', 'missing_punch'],
      status: 'partial',
    }
  }
  if (n > 4) {
    return {
      check_in: punches[0],
      lunch_start: punches[1],
      lunch_end: punches[2],
      check_out: punches[3],
      anomalyTypes: ['extra_punches'],
      status: 'present',
    }
  }

  return empty()
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
    .select('id')
    .eq('company_id', companyId)
    .eq('status', 'active')

  if (empErr) {
    throw new Error(`employees: ${empErr.message}`)
  }

  const employeeIds = (employees || []).map((e: { id: string }) => e.id)
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
      results.push({
        employeeId,
        punchCount: 0,
        anomalyTypes: [],
        recordId: (existing?.id as string) || null,
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
  employee: { id: string; name: string; department_id: string | null }
  bucket: 'normal' | 'anomaly'
  anomaly_types: string[]
  events: { id: string; ts_utc: string; device_id: string | null }[]
  record: Record<string, unknown> | null
}

/**
 * Build UI payload for GET daily-close (does not mutate).
 */
export async function buildDailyCloseReportPayload(params: {
  companyId: string
  localDate: string
  supabase: { from: (t: string) => any }
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
  const { biometric_mode, timezone } = await getResolvedAttendanceConfig(supabase, companyId)

  const { data: employees } = await supabase
    .from('employees')
    .select('id, name, department_id')
    .eq('company_id', companyId)
    .eq('status', 'active')
    .order('name')

  const list = employees || []
  const employeeIds = list.map((e: { id: string }) => e.id)

  let events: { id: string; employee_id: string; ts_utc: string; device_id: string | null }[] = []
  if (employeeIds.length > 0) {
    const { data: evData } = await supabase
      .from('attendance_events')
      .select('id, employee_id, ts_utc, device_id')
      .eq('local_date', localDate)
      .in('employee_id', employeeIds)
      .eq('event_type', RAW_PUNCH_EVENT_TYPE)
      .order('ts_utc', { ascending: true })
    events = (evData || []) as typeof events
  }

  const evByEmp = new Map<string, { id: string; ts_utc: string; device_id: string | null }[]>()
  for (const e of events) {
    if (!evByEmp.has(e.employee_id)) evByEmp.set(e.employee_id, [])
    evByEmp.get(e.employee_id)!.push({ id: e.id, ts_utc: e.ts_utc, device_id: e.device_id })
  }

  let records: Record<string, unknown>[] = []
  if (employeeIds.length > 0) {
    const { data: recData } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('date', localDate)
      .in('employee_id', employeeIds)
    records = (recData || []) as Record<string, unknown>[]
  }

  const recByEmp = new Map<string, Record<string, unknown>>()
  for (const r of records) {
    recByEmp.set(r.employee_id as string, r)
  }

  let total_with_events = 0
  let total_anomalies = 0
  let total_finalized = 0

  const items: DailyCloseReportItem[] = list.map((emp: { id: string; name: string; department_id: string | null }) => {
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
    const bucket: 'normal' | 'anomaly' = anomaly_types.length > 0 ? 'anomaly' : 'normal'

    if (evs.length > 0) total_with_events++
    if (bucket === 'anomaly') total_anomalies++
    if (flags?.close_state === 'finalized') total_finalized++

    return {
      employee: { id: emp.id, name: emp.name, department_id: emp.department_id },
      bucket,
      anomaly_types,
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
      total_employees: list.length,
      total_with_events,
      total_anomalies,
      total_finalized,
    },
    items,
  }
}
