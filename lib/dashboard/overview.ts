/**
 * Dashboard overview: tipos de respuesta y funciones puras que arman cada bloque.
 * El handler (pages/api/dashboard/overview.ts) solo consulta datos y llama a estas funciones,
 * así la lógica se prueba sin Supabase (tests/dashboard-overview.test.ts).
 */

// ---------- Tipos de respuesta (compartidos con el frontend) ----------

export type PendingSeverity = 'urgent' | 'warning' | 'info'

export interface PendingItem {
  id: 'open_punches' | 'leave_requests' | 'payroll_run' | 'corrections' | 'terminations'
  severity: PendingSeverity
  count: number
  title: string
  detail: string
  /** Texto corto de cuándo: "Ayer", "Hace 3 días", "Paga en 7 días". */
  when: string
  cta: string
  href: string
}

export interface DayAttendance {
  date: string
  scheduled: number
  present: number
  onTime: number
  late: number
  absent: number
  paidLeave: number
}

export type MissingStatus = 'absent' | 'late' | 'paid_leave'

export interface MissingEmployee {
  employeeId: string
  name: string
  departmentName: string | null
  status: MissingStatus
  lateMinutes: number | null
  checkIn: string | null
}

export interface DepartmentSummary {
  id: string | null
  name: string
  headcount: number
  scheduledToday: number
  presentToday: number
  /** null cuando nadie estaba programado hoy. */
  attendancePct: number | null
}

export interface PayrollRunSummary {
  id: string
  label: string
  year: number
  month: number
  quincena: number | null
  tipo: string | null
  status: string
  employeeCount: number
  /** Omitido (null) sin permiso de salarios. */
  net: number | null
  createdAt: string
  authorizedAt: string | null
}

export interface CostPoint {
  period: string // YYYY-MM
  gross: number
  net: number
  deductions: number
}

export interface CalendarEvent {
  date: string
  kind: 'payment' | 'holiday' | 'anniversary' | 'termination'
  title: string
  subtitle: string
}

export interface DashboardOverview {
  generatedAt: string
  today: string
  scope: {
    kind: 'company' | 'departments'
    departmentIds: string[]
    employeeCount: number
  }
  access: {
    payroll: boolean
    salary: boolean
    openPunches: boolean
    leave: boolean
    corrections: boolean
  }
  pending: PendingItem[]
  attendance: {
    today: DayAttendance | null
    yesterday: DayAttendance | null
    /** % presentes / (presentes + ausentes) de los últimos 7 días; null sin datos. */
    rate7d: number | null
    rate7dPrev: number | null
    avgLateMinutesToday: number | null
    series: DayAttendance[]
    missingToday: MissingEmployee[]
    missingTodayTotal: number
  }
  departments: DepartmentSummary[]
  payroll: null | {
    runs: PayrollRunSummary[]
    /** null sin permiso de salarios. */
    costTrend: CostPoint[] | null
    nextPayment: { periodStart: string; periodEnd: string; daysUntil: number } | null
  }
  calendar: CalendarEvent[]
  /** Bloques que fallaron; el resto de la respuesta sigue siendo válida. */
  warnings: string[]
}

// ---------- Fechas (ISO YYYY-MM-DD, sin zona) ----------

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const t = Date.UTC(y, m - 1, d) + days * 86_400_000
  return new Date(t).toISOString().slice(0, 10)
}

export function daysBetween(fromIso: string, toIso: string): number {
  const [y1, m1, d1] = fromIso.split('-').map(Number)
  const [y2, m2, d2] = toIso.split('-').map(Number)
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000)
}

const MONTHS_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

export function relativeDayLabel(dateIso: string, today: string): string {
  const diff = daysBetween(dateIso, today)
  if (diff === 0) return 'Hoy'
  if (diff === 1) return 'Ayer'
  if (diff > 1) return `Hace ${diff} días`
  if (diff === -1) return 'Mañana'
  return `En ${-diff} días`
}

// ---------- Asistencia ----------

export interface DayKpiRow {
  work_date: string
  programados: number | string
  presentes: number | string
  ausentes: number | string
  permisos_pagados: number | string
  tardes: number | string
}

function toDay(row: DayKpiRow): DayAttendance {
  const present = Number(row.presentes) || 0
  const late = Math.min(Number(row.tardes) || 0, present)
  return {
    date: String(row.work_date).slice(0, 10),
    scheduled: Number(row.programados) || 0,
    present,
    onTime: present - late,
    late,
    absent: Number(row.ausentes) || 0,
    paidLeave: Number(row.permisos_pagados) || 0,
  }
}

function rateBetween(days: DayAttendance[], fromIso: string, toIso: string): number | null {
  let present = 0
  let absent = 0
  for (const d of days) {
    if (d.date < fromIso || d.date > toIso) continue
    present += d.present
    absent += d.absent
  }
  const denom = present + absent
  return denom > 0 ? Math.round((present / denom) * 1000) / 10 : null
}

export function summarizeAttendanceSeries(rows: DayKpiRow[], today: string, seriesLength = 30) {
  const days = rows
    .map(toDay)
    .filter((d) => d.scheduled > 0 && d.date <= today)
    .sort((a, b) => a.date.localeCompare(b.date))

  const todayRow = days.find((d) => d.date === today) ?? null
  const past = days.filter((d) => d.date < today)
  const yesterday = past.length > 0 ? past[past.length - 1] : null

  return {
    today: todayRow,
    yesterday,
    rate7d: rateBetween(days, addDays(today, -6), today),
    rate7dPrev: rateBetween(days, addDays(today, -13), addDays(today, -7)),
    series: days.slice(-seriesLength),
  }
}

/** Fila de attendance_lists_filtered(p_type => 'all'). */
export interface TodayListRow {
  id: string
  name: string | null
  status: string | null
  late_minutes: number | null
  check_in: string | null
}

export function classifyTodayRow(row: TodayListRow): 'present' | MissingStatus {
  if (!row.check_in) return row.status === 'paid_leave' ? 'paid_leave' : 'absent'
  return (row.late_minutes ?? 0) > 5 ? 'late' : 'present'
}

const MISSING_ORDER: Record<MissingStatus, number> = { absent: 0, late: 1, paid_leave: 2 }

export function summarizeToday(
  rows: TodayListRow[],
  employeeDept: Map<string, string | null>,
  deptNames: Map<string, string>,
  limit = 5
) {
  const missing: MissingEmployee[] = []
  const byDept = new Map<string | null, { scheduled: number; present: number }>()
  let lateSum = 0
  let lateCount = 0

  for (const row of rows) {
    if (!employeeDept.has(row.id)) continue // fuera del alcance (otro departamento)
    const deptId = employeeDept.get(row.id) ?? null
    const kind = classifyTodayRow(row)
    const bucket = byDept.get(deptId) ?? { scheduled: 0, present: 0 }
    bucket.scheduled += 1
    if (kind === 'present' || kind === 'late') bucket.present += 1
    byDept.set(deptId, bucket)

    if (kind === 'late') {
      lateSum += row.late_minutes ?? 0
      lateCount += 1
    }
    if (kind !== 'present') {
      missing.push({
        employeeId: row.id,
        name: row.name ?? 'Sin nombre',
        departmentName: deptId ? deptNames.get(deptId) ?? null : null,
        status: kind,
        lateMinutes: kind === 'late' ? row.late_minutes ?? null : null,
        checkIn: row.check_in,
      })
    }
  }

  missing.sort(
    (a, b) =>
      MISSING_ORDER[a.status] - MISSING_ORDER[b.status] ||
      (b.lateMinutes ?? 0) - (a.lateMinutes ?? 0) ||
      a.name.localeCompare(b.name, 'es')
  )

  return {
    missingToday: missing.slice(0, limit),
    missingTodayTotal: missing.length,
    avgLateMinutesToday: lateCount > 0 ? Math.round(lateSum / lateCount) : null,
    byDept,
  }
}

export function buildDepartmentSummaries(
  employees: Array<{ department_id: string | null }>,
  departments: Array<{ id: string; name: string }>,
  byDept: Map<string | null, { scheduled: number; present: number }>
): DepartmentSummary[] {
  const headcount = new Map<string | null, number>()
  for (const e of employees) {
    const k = e.department_id ?? null
    headcount.set(k, (headcount.get(k) ?? 0) + 1)
  }
  const names = new Map(departments.map((d) => [d.id, d.name]))
  const keys = new Set<string | null>([...headcount.keys(), ...byDept.keys()])

  return [...keys]
    .map((id) => {
      const today = byDept.get(id) ?? { scheduled: 0, present: 0 }
      return {
        id,
        name: id ? names.get(id) ?? 'Departamento' : 'Sin departamento',
        headcount: headcount.get(id) ?? 0,
        scheduledToday: today.scheduled,
        presentToday: today.present,
        attendancePct: today.scheduled > 0 ? Math.round((today.present / today.scheduled) * 100) : null,
      }
    })
    .filter((d) => d.headcount > 0)
    .sort((a, b) => b.headcount - a.headcount || a.name.localeCompare(b.name, 'es'))
}

// ---------- Nómina ----------

export interface RunRow {
  id: string
  year: number
  month: number
  quincena: number | null
  tipo: string | null
  status: string
  created_at: string
  authorized_at: string | null
}

export interface RunLineRow {
  run_id: string
  eff_bruto?: number | string | null
  eff_neto?: number | string | null
}

export function payrollRunLabel(run: Pick<RunRow, 'year' | 'month' | 'quincena'>): string {
  const month = MONTHS_ES[(run.month - 1 + 12) % 12] ?? String(run.month)
  if (run.quincena === 1 || run.quincena === 2) {
    return `${run.quincena === 1 ? '1.ª' : '2.ª'} quincena ${month} ${run.year}`
  }
  return `${month.charAt(0).toUpperCase()}${month.slice(1)} ${run.year}`
}

export function summarizeRunLines(lines: RunLineRow[]) {
  const totals = new Map<string, { gross: number; net: number; employees: number }>()
  for (const l of lines) {
    const t = totals.get(l.run_id) ?? { gross: 0, net: 0, employees: 0 }
    t.gross += Number(l.eff_bruto) || 0
    t.net += Number(l.eff_neto) || 0
    t.employees += 1
    totals.set(l.run_id, t)
  }
  return totals
}

const RUN_STATUS_RANK: Record<string, number> = {
  draft: 0, edited: 1, authorized: 2, distributed: 3, paid: 4,
}

function periodKey(run: Pick<RunRow, 'year' | 'month' | 'quincena'>): string {
  return `${run.year}-${String(run.month).padStart(2, '0')}-${run.quincena ?? 0}`
}

/**
 * Una corrida por periodo (las re-generaciones dejan borradores duplicados):
 * la de estado más avanzado y, a igualdad, la más reciente. Ordenadas del periodo más nuevo al más viejo.
 */
export function latestRunPerPeriod(runs: RunRow[]): RunRow[] {
  const best = new Map<string, RunRow>()
  for (const r of runs) {
    const k = periodKey(r)
    const cur = best.get(k)
    const rank = RUN_STATUS_RANK[r.status] ?? -1
    const curRank = cur ? RUN_STATUS_RANK[cur.status] ?? -1 : -2
    if (!cur || rank > curRank || (rank === curRank && r.created_at > cur.created_at)) {
      best.set(k, r)
    }
  }
  return [...best.values()].sort((a, b) => periodKey(b).localeCompare(periodKey(a)))
}

export function summarizeRuns(
  runs: RunRow[],
  totals: Map<string, { gross: number; net: number; employees: number }>,
  canViewSalary: boolean
): PayrollRunSummary[] {
  return runs.map((r) => {
    const t = totals.get(r.id)
    return {
      id: r.id,
      label: payrollRunLabel(r),
      year: r.year,
      month: r.month,
      quincena: r.quincena,
      tipo: r.tipo,
      status: r.status,
      employeeCount: t?.employees ?? 0,
      net: canViewSalary && t ? Math.round(t.net * 100) / 100 : null,
      createdAt: r.created_at,
      authorizedAt: r.authorized_at,
    }
  })
}

/** Costo por mes (solo corridas autorizadas o posteriores) de los últimos `months` meses hasta `today`. */
export function buildCostTrend(
  runs: RunRow[],
  totals: Map<string, { gross: number; net: number }>,
  today: string,
  months = 6
): CostPoint[] {
  const [ty, tm] = today.split('-').map(Number)
  const periods: string[] = []
  for (let i = months - 1; i >= 0; i -= 1) {
    const idx = ty * 12 + (tm - 1) - i
    periods.push(`${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, '0')}`)
  }
  const acc = new Map(periods.map((p) => [p, { gross: 0, net: 0 }]))
  for (const r of runs) {
    if ((RUN_STATUS_RANK[r.status] ?? -1) < RUN_STATUS_RANK.authorized) continue
    const p = `${r.year}-${String(r.month).padStart(2, '0')}`
    const slot = acc.get(p)
    const t = totals.get(r.id)
    if (!slot || !t) continue
    slot.gross += t.gross
    slot.net += t.net
  }
  return periods.map((period) => {
    const { gross, net } = acc.get(period)!
    const round = (n: number) => Math.round(n * 100) / 100
    return { period, gross: round(gross), net: round(net), deductions: round(gross - net) }
  })
}

// ---------- Calendario ----------

export interface CalendarEmployee {
  name: string
  hire_date: string | null
  termination_date: string | null
}

function nextAnniversary(hireIso: string, today: string): { date: string; years: number } {
  const [hy, hm, hd] = hireIso.split('-').map(Number)
  const ty = Number(today.slice(0, 4))
  const build = (year: number) => {
    const lastDay = new Date(Date.UTC(year, hm, 0)).getUTCDate()
    return `${year}-${String(hm).padStart(2, '0')}-${String(Math.min(hd, lastDay)).padStart(2, '0')}`
  }
  let year = ty
  let date = build(year)
  if (date < today) {
    year += 1
    date = build(year)
  }
  return { date, years: year - hy }
}

export function buildCalendar(params: {
  today: string
  horizonDays?: number
  limit?: number
  nextPayment?: { periodStart: string; periodEnd: string } | null
  holidays?: Array<{ date: string; name?: string | null }>
  employees?: CalendarEmployee[]
}): CalendarEvent[] {
  const { today, horizonDays = 60, limit = 8 } = params
  const end = addDays(today, horizonDays)
  const inWindow = (d: string) => d >= today && d <= end
  const events: CalendarEvent[] = []

  if (params.nextPayment && inWindow(params.nextPayment.periodEnd)) {
    events.push({
      date: params.nextPayment.periodEnd,
      kind: 'payment',
      title: 'Pago de planilla',
      subtitle: `Periodo ${params.nextPayment.periodStart} al ${params.nextPayment.periodEnd}`,
    })
  }

  const seenHoliday = new Set<string>()
  for (const h of params.holidays ?? []) {
    const d = String(h.date ?? '').slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || !inWindow(d) || seenHoliday.has(d)) continue
    seenHoliday.add(d)
    events.push({ date: d, kind: 'holiday', title: h.name?.trim() || 'Feriado', subtitle: 'Feriado' })
  }

  for (const e of params.employees ?? []) {
    if (e.hire_date && /^\d{4}-\d{2}-\d{2}/.test(e.hire_date)) {
      const a = nextAnniversary(e.hire_date.slice(0, 10), today)
      if (a.years >= 1 && inWindow(a.date)) {
        events.push({
          date: a.date,
          kind: 'anniversary',
          title: `Aniversario laboral · ${e.name}`,
          subtitle: a.years === 1 ? '1 año en la empresa' : `${a.years} años en la empresa`,
        })
      }
    }
    if (e.termination_date && inWindow(e.termination_date.slice(0, 10))) {
      events.push({
        date: e.termination_date.slice(0, 10),
        kind: 'termination',
        title: `Baja programada · ${e.name}`,
        subtitle: 'Fecha de terminación registrada',
      })
    }
  }

  const kindOrder: Record<CalendarEvent['kind'], number> = { payment: 0, holiday: 1, termination: 2, anniversary: 3 }
  return events
    .sort((a, b) => a.date.localeCompare(b.date) || kindOrder[a.kind] - kindOrder[b.kind])
    .slice(0, limit)
}

// ---------- Pendientes ----------

export function buildPendingItems(params: {
  today: string
  openPunches?: { date: string; count: number } | null
  leave?: { count: number; oldestCreatedAt: string | null } | null
  corrections?: number | null
  unauthorizedRun?: { label: string; status: string; payDate: string | null } | null
  terminations?: { count: number; nextDate: string } | null
}): PendingItem[] {
  const { today } = params
  const items: PendingItem[] = []

  if (params.openPunches && params.openPunches.count > 0) {
    const { date, count } = params.openPunches
    items.push({
      id: 'open_punches',
      severity: 'urgent',
      count,
      title: count === 1 ? '1 marcaje sin salida' : `${count} marcajes sin salida`,
      detail: `Revisar en el cierre diario del ${date}`,
      when: relativeDayLabel(date, today),
      cta: 'Ir al cierre diario',
      href: `/app/attendance/dashboard?date=${date}`,
    })
  }

  if (params.leave && params.leave.count > 0) {
    const { count, oldestCreatedAt } = params.leave
    items.push({
      id: 'leave_requests',
      severity: 'warning',
      count,
      title: count === 1 ? '1 permiso por aprobar' : `${count} permisos por aprobar`,
      detail: 'Solicitudes pendientes de respuesta',
      when: oldestCreatedAt ? `La más antigua: ${relativeDayLabel(oldestCreatedAt.slice(0, 10), today).toLowerCase()}` : '',
      cta: 'Revisar solicitudes',
      href: '/app/leave',
    })
  }

  if (params.unauthorizedRun) {
    const { label, status, payDate } = params.unauthorizedRun
    const daysToPay = payDate ? daysBetween(today, payDate) : null
    items.push({
      id: 'payroll_run',
      severity: daysToPay !== null && daysToPay <= 3 ? 'urgent' : 'warning',
      count: 1,
      title: `Planilla ${label}`,
      detail: `${status === 'edited' ? 'Editada' : 'Borrador'} · falta autorizar`,
      when: daysToPay === null ? '' : daysToPay < 0 ? 'Fecha de pago vencida' : daysToPay === 0 ? 'Paga hoy' : `Paga en ${daysToPay} días`,
      cta: 'Revisar y autorizar',
      href: '/app/payroll',
    })
  }

  if (params.corrections && params.corrections > 0) {
    const n = params.corrections
    items.push({
      id: 'corrections',
      severity: 'info',
      count: n,
      title: n === 1 ? '1 corrección de marcaje' : `${n} correcciones de marcaje`,
      detail: 'Pendientes de revisión',
      when: '',
      cta: 'Ver correcciones',
      href: '/app/attendance/corrections',
    })
  }

  if (params.terminations && params.terminations.count > 0) {
    const { count, nextDate } = params.terminations
    items.push({
      id: 'terminations',
      severity: 'info',
      count,
      title: count === 1 ? '1 baja programada' : `${count} bajas programadas`,
      detail: 'Próximos 30 días',
      when: relativeDayLabel(nextDate, today),
      cta: 'Ver empleados',
      href: '/app/employees',
    })
  }

  const order: Record<PendingSeverity, number> = { urgent: 0, warning: 1, info: 2 }
  return items.sort((a, b) => order[a.severity] - order[b.severity])
}
