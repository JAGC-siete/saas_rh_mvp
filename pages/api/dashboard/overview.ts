import type { NextApiRequest, NextApiResponse } from 'next'
import { DateTime } from 'luxon'
import { requireCompanyAccess } from '../../../lib/auth/api-auth-fixed'
import { createAdminClient } from '../../../lib/supabase/server'
import { canAccessPayrollNavigation, normalizeRole } from '../../../lib/auth/role-access'
import { hasPermission } from '../../../lib/auth-utils'
import { resolveFieldAccessContext } from '../../../lib/security/field-access'
import { buildCompanyPeriodConfig } from '../../../lib/payroll/period-config'
import { getUpcomingPeriods } from '../../../lib/payroll/period-dates'
import {
  addDays,
  buildCalendar,
  buildCostTrend,
  buildDepartmentSummaries,
  buildPendingItems,
  daysBetween,
  latestRunPerPeriod,
  payrollRunLabel,
  summarizeAttendanceSeries,
  summarizeRunLines,
  summarizeRuns,
  summarizeToday,
  type DashboardOverview,
  type DayKpiRow,
  type RunLineRow,
  type RunRow,
  type TodayListRow,
} from '../../../lib/dashboard/overview'

/** Roles que operan el cierre diario (igual que /api/attendance/daily-close). */
const DAILY_CLOSE_ROLES = ['super_admin', 'company_admin', 'hr_manager', 'admin']
const SERIES_DAYS = 42 // ~30 días hábiles
const FALLBACK_SERIES_DAYS = 14
const RECENT_RUNS = 3
const COST_MONTHS = 6
const PAGE_SIZE = 1000
const MAX_PAGES = 20

type QueryResult<T> = PromiseLike<{ data: T[] | null; error: { message: string; code?: string } | null }>

/** Pagina un select/rpc de PostgREST (límite de 1000 filas por respuesta). */
async function fetchAll<T>(build: (from: number, to: number) => QueryResult<T>): Promise<T[]> {
  const out: T[] = []
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const from = page * PAGE_SIZE
    const { data, error } = await build(from, from + PAGE_SIZE - 1)
    if (error) throw new Error(error.message)
    const rows = data ?? []
    out.push(...rows)
    if (rows.length < PAGE_SIZE) break
  }
  return out
}

function isMissingFunction(error: { code?: string } | null): boolean {
  return !!error && (error.code === 'PGRST202' || error.code === '42883')
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  let auth
  try {
    auth = await requireCompanyAccess(req, res)
  } catch {
    // requireCompanyAccess ya respondió (401/400).
    if (!res.headersSent) res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const { supabase, companyId, userProfile, companyTimezone, companyCountryCode } = auth
  if (!companyId) {
    return res.status(400).json({ error: 'Company ID is required' })
  }

  const role = normalizeRole(auth.role) ?? (auth.role as string)
  const admin = createAdminClient()
  const warnings: string[] = []

  /** Ejecuta un bloque; si falla, registra el aviso y devuelve el valor por defecto. */
  async function block<T>(name: string, fn: () => Promise<T>, fallback: T): Promise<T> {
    try {
      return await fn()
    } catch (err) {
      console.error(`[dashboard/overview] ${name}:`, err instanceof Error ? err.message : err)
      warnings.push(name)
      return fallback
    }
  }

  try {
    const today = DateTime.now().setZone(companyTimezone || 'America/Tegucigalpa').toISODate()!

    // ---- Alcance: empresa completa o departamentos del gerente ----
    const [deptRes, empRes] = await Promise.all([
      admin.from('departments').select('id, name, manager_id').eq('company_id', companyId),
      fetchAll<{ id: string; name: string; department_id: string | null; hire_date: string | null; termination_date: string | null }>(
        (from, to) =>
          admin
            .from('employees')
            .select('id, name, department_id, hire_date, termination_date')
            .eq('company_id', companyId)
            .eq('status', 'active')
            .order('id')
            .range(from, to)
      ),
    ])
    if (deptRes.error) throw new Error(deptRes.error.message)

    const departments = (deptRes.data ?? []) as Array<{ id: string; name: string; manager_id: string | null }>
    const isManager = role === 'manager'
    const managerEmployeeId = typeof userProfile?.employee_id === 'string' ? userProfile.employee_id : null
    const scopedDeptIds = isManager
      ? departments.filter((d) => managerEmployeeId && d.manager_id === managerEmployeeId).map((d) => d.id)
      : []
    const employees = isManager
      ? empRes.filter((e) => e.department_id && scopedDeptIds.includes(e.department_id))
      : empRes
    const scopeEmpty = isManager && scopedDeptIds.length === 0

    const employeeDept = new Map(employees.map((e) => [e.id, e.department_id]))
    const deptNames = new Map(departments.map((d) => [d.id, d.name]))

    // ---- Permisos por bloque ----
    const fieldCtx = await resolveFieldAccessContext(userProfile, admin)
    const access = {
      payroll: canAccessPayrollNavigation(role),
      salary: canAccessPayrollNavigation(role) && fieldCtx.canViewSalary,
      openPunches: DAILY_CLOSE_ROLES.includes(role),
      leave: hasPermission(userProfile, 'can_manage_employees') || hasPermission(userProfile, 'can_approve_leave'),
      corrections: DAILY_CLOSE_ROLES.includes(role) || isManager,
    }

    // ---- Asistencia: serie diaria ----
    const seriesP = block('attendance_series', async () => {
      if (scopeEmpty) return [] as DayKpiRow[]
      const { data, error } = await supabase.rpc('attendance_daily_kpis', {
        p_company_id: companyId,
        p_from: addDays(today, -(SERIES_DAYS - 1)),
        p_to: today,
        p_department_ids: isManager ? scopedDeptIds : null,
      })
      if (!error) return (data ?? []) as DayKpiRow[]
      if (!isMissingFunction(error)) throw new Error(error.message)

      // Migración 20261008160000 aún no aplicada: serie corta con la RPC por día.
      const deptFilter: Array<string | null> = isManager ? scopedDeptIds : [null]
      const days = Array.from({ length: FALLBACK_SERIES_DAYS }, (_, i) => addDays(today, -i))
      const rows = await Promise.all(
        days.map(async (day) => {
          const parts = await Promise.all(
            deptFilter.map(async (deptId) => {
              const r = await supabase.rpc('attendance_kpis_filtered', {
                p_employee_id: null,
                p_from: day,
                p_to: day,
                p_role: null,
                p_department_id: deptId,
                p_company_id: companyId,
              })
              if (r.error) throw new Error(r.error.message)
              return (Array.isArray(r.data) ? r.data[0] : r.data) ?? {}
            })
          )
          const sum = (k: string) => parts.reduce((s, p: any) => s + (Number(p?.[k]) || 0), 0)
          return {
            work_date: day,
            programados: sum('total_empleados'),
            presentes: sum('presentes'),
            ausentes: sum('ausentes'),
            permisos_pagados: sum('permisos_pagados'),
            tardes: sum('tardes'),
          } satisfies DayKpiRow
        })
      )
      return rows
    }, [] as DayKpiRow[])

    // ---- Asistencia: detalle de hoy (quién falta, por departamento) ----
    const todayListP = block('attendance_today', async () => {
      if (scopeEmpty) return [] as TodayListRow[]
      return fetchAll<TodayListRow>((from, to) =>
        supabase
          .rpc('attendance_lists_filtered', {
            p_employee_id: null,
            p_from: today,
            p_to: today,
            p_type: 'all',
            p_role: null,
            p_department_id: isManager && scopedDeptIds.length === 1 ? scopedDeptIds[0] : null,
            p_company_id: companyId,
          })
          .select('id, name, status, late_minutes, check_in')
          .range(from, to)
      )
    }, [] as TodayListRow[])

    // ---- Pendientes ----
    const openPunchesP = block('open_punches', async () => {
      if (!access.openPunches) return null
      const { data, error } = await admin
        .from('attendance_records')
        .select('date, employees!attendance_records_employee_id_fkey!inner(company_id)')
        .eq('employees.company_id', companyId)
        .not('check_in', 'is', null)
        .is('check_out', null)
        .gte('date', addDays(today, -7))
        .lt('date', today)
        .order('date', { ascending: false })
        .limit(PAGE_SIZE)
      if (error) throw new Error(error.message)
      const rows = (data ?? []) as Array<{ date: string }>
      if (rows.length === 0) return null
      const latest = rows[0].date
      return { date: latest, count: rows.filter((r) => r.date === latest).length }
    }, null as { date: string; count: number } | null)

    const leaveP = block('leave_requests', async () => {
      if (!access.leave || scopeEmpty) return null
      let q = admin
        .from('leave_requests')
        .select('id, created_at, employee:employees!leave_requests_employee_id_fkey!inner(company_id, department_id)')
        .eq('status', 'pending')
        .eq('employee.company_id', companyId)
        .order('created_at', { ascending: true })
        .limit(PAGE_SIZE)
      if (isManager) q = q.in('employee.department_id', scopedDeptIds)
      const { data, error } = await q
      if (error) throw new Error(error.message)
      const rows = (data ?? []) as Array<{ created_at: string }>
      return { count: rows.length, oldestCreatedAt: rows[0]?.created_at ?? null }
    }, null as { count: number; oldestCreatedAt: string | null } | null)

    const correctionsP = block('corrections', async () => {
      if (!access.corrections || scopeEmpty) return null
      let q = admin
        .from('attendance_corrections')
        .select('id, employees:employee_id!inner(department_id)', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('status', 'pending')
      if (isManager) q = q.in('employees.department_id', scopedDeptIds)
      const { count, error } = await q
      if (error) throw new Error(error.message)
      return count ?? 0
    }, null as number | null)

    // ---- Nómina ----
    const payrollP = block('payroll', async () => {
      if (!access.payroll) return null

      const [runsRes, configRes] = await Promise.all([
        admin
          .from('payroll_runs')
          .select('id, year, month, quincena, tipo, status, created_at, authorized_at')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(120),
        admin
          .from('company_payroll_configs')
          .select('payment_frequency, quincena_config, metadata')
          .eq('company_id', companyId)
          .eq('is_active', true)
          .maybeSingle(),
      ])
      if (runsRes.error) throw new Error(runsRes.error.message)

      const runs = latestRunPerPeriod((runsRes.data ?? []) as RunRow[])
      const recent = runs.slice(0, RECENT_RUNS)
      const [ty, tm] = today.split('-').map(Number)
      const firstCostIdx = ty * 12 + (tm - 1) - (COST_MONTHS - 1)
      const costRuns = runs.filter((r) => r.year * 12 + (r.month - 1) >= firstCostIdx)

      const runIds = [...new Set([...recent, ...(access.salary ? costRuns : [])].map((r) => r.id))]
      const lines = runIds.length
        ? await fetchAll<RunLineRow>((from, to) =>
            admin
              .from('payroll_run_lines')
              .select(access.salary ? 'run_id, eff_bruto, eff_neto' : 'run_id')
              .in('run_id', runIds)
              .order('id')
              .range(from, to) as unknown as QueryResult<RunLineRow>
          )
        : []
      const totals = summarizeRunLines(lines)

      let nextPayment: { periodStart: string; periodEnd: string; daysUntil: number } | null = null
      if (!configRes.error) {
        const periods = getUpcomingPeriods(buildCompanyPeriodConfig(configRes.data), 3)
        const next = periods.find((p) => p.fechaFin >= today)
        if (next) {
          nextPayment = {
            periodStart: next.fechaInicio,
            periodEnd: next.fechaFin,
            daysUntil: daysBetween(today, next.fechaFin),
          }
        }
      }

      const unauthorized = runs.find((r) => r.status === 'draft' || r.status === 'edited') ?? null

      return {
        runs: summarizeRuns(recent, totals, access.salary),
        costTrend: access.salary ? buildCostTrend(costRuns, totals, today, COST_MONTHS) : null,
        nextPayment,
        unauthorized,
      }
    }, null)

    // ---- Calendario: feriados ----
    const holidaysP = block('holidays', async () => {
      const end = addDays(today, 60)
      const years = [...new Set([today.slice(0, 4), end.slice(0, 4)].map(Number))]
      const [lawRes, metaRes] = await Promise.all([
        admin
          .from('labor_laws')
          .select('holidays')
          .eq('country_code', companyCountryCode || 'HND')
          .eq('is_active', true)
          .in('year', years),
        admin.from('company_metadata').select('custom_holidays').eq('company_id', companyId).maybeSingle(),
      ])
      if (lawRes.error) throw new Error(lawRes.error.message)
      const list: Array<{ date: string; name?: string | null }> = []
      for (const row of lawRes.data ?? []) {
        if (Array.isArray((row as any).holidays)) list.push(...(row as any).holidays)
      }
      if (!metaRes.error && Array.isArray((metaRes.data as any)?.custom_holidays)) {
        list.push(...(metaRes.data as any).custom_holidays)
      }
      return list
    }, [] as Array<{ date: string; name?: string | null }>)

    const [seriesRows, todayRows, openPunches, leave, corrections, payroll, holidays] = await Promise.all([
      seriesP, todayListP, openPunchesP, leaveP, correctionsP, payrollP, holidaysP,
    ])

    // ---- Armado ----
    const series = summarizeAttendanceSeries(seriesRows, today)
    const todaySummary = summarizeToday(todayRows, employeeDept, deptNames)

    const upcomingTerminations = employees
      .filter((e) => e.termination_date && e.termination_date >= today && e.termination_date <= addDays(today, 30))
      .map((e) => e.termination_date as string)
      .sort()

    const unauthorizedRun = payroll?.unauthorized
      ? {
          label: payrollRunLabel(payroll.unauthorized),
          status: payroll.unauthorized.status,
          payDate: payroll.nextPayment?.periodEnd ?? null,
        }
      : null

    const body: DashboardOverview = {
      generatedAt: new Date().toISOString(),
      today,
      scope: {
        kind: isManager ? 'departments' : 'company',
        departmentIds: scopedDeptIds,
        employeeCount: employees.length,
      },
      access,
      pending: buildPendingItems({
        today,
        openPunches,
        leave,
        corrections,
        unauthorizedRun,
        terminations: upcomingTerminations.length
          ? { count: upcomingTerminations.length, nextDate: upcomingTerminations[0] }
          : null,
      }),
      attendance: {
        today: series.today,
        yesterday: series.yesterday,
        rate7d: series.rate7d,
        rate7dPrev: series.rate7dPrev,
        avgLateMinutesToday: todaySummary.avgLateMinutesToday,
        series: series.series,
        missingToday: todaySummary.missingToday,
        missingTodayTotal: todaySummary.missingTodayTotal,
      },
      departments: buildDepartmentSummaries(employees, departments, todaySummary.byDept),
      payroll: payroll
        ? { runs: payroll.runs, costTrend: payroll.costTrend, nextPayment: payroll.nextPayment }
        : null,
      calendar: buildCalendar({
        today,
        nextPayment: access.payroll ? payroll?.nextPayment ?? null : null,
        holidays,
        employees,
      }),
      warnings,
    }

    res.setHeader('Cache-Control', 'private, no-store')
    return res.status(200).json(body)
  } catch (error) {
    console.error('[dashboard/overview] error:', error)
    if (res.headersSent) return
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Error desconocido',
    })
  }
}
