import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  addDays,
  buildCalendar,
  buildCostTrend,
  buildDepartmentSummaries,
  buildPendingItems,
  latestRunPerPeriod,
  payrollRunLabel,
  summarizeAttendanceSeries,
  summarizeRunLines,
  summarizeRuns,
  summarizeToday,
  type DayKpiRow,
  type RunRow,
} from '../lib/dashboard/overview'

const TODAY = '2026-10-08'

function day(date: string, p: Partial<Record<keyof DayKpiRow, number>>): DayKpiRow {
  return {
    work_date: date,
    programados: p.programados ?? 10,
    presentes: p.presentes ?? 9,
    ausentes: p.ausentes ?? 1,
    permisos_pagados: p.permisos_pagados ?? 0,
    tardes: p.tardes ?? 2,
  }
}

describe('dates', () => {
  it('addDays crosses month and year boundaries', () => {
    assert.equal(addDays('2026-10-01', -1), '2026-09-30')
    assert.equal(addDays('2026-12-31', 1), '2027-01-01')
  })
})

describe('summarizeAttendanceSeries', () => {
  it('splits today, yesterday and 7-day rates, skipping non-work days', () => {
    const rows = [
      day('2026-09-28', { presentes: 5, ausentes: 5 }), // semana previa
      day('2026-10-04', { programados: 0, presentes: 0, ausentes: 0 }), // domingo
      day('2026-10-06', { presentes: 8, ausentes: 2 }),
      day('2026-10-07', { presentes: 9, ausentes: 1, tardes: 3 }),
      day(TODAY, { presentes: 10, ausentes: 0, tardes: 1 }),
    ]
    const s = summarizeAttendanceSeries(rows, TODAY)
    assert.equal(s.today?.date, TODAY)
    assert.equal(s.today?.onTime, 9)
    assert.equal(s.yesterday?.date, '2026-10-07')
    assert.equal(s.yesterday?.late, 3)
    assert.equal(s.rate7d, 90) // 27 / 30
    assert.equal(s.rate7dPrev, 50)
    assert.equal(s.series.length, 4)
    assert.ok(s.series.every((d) => d.scheduled > 0))
  })

  it('returns nulls without data and caps late at present', () => {
    const empty = summarizeAttendanceSeries([], TODAY)
    assert.equal(empty.today, null)
    assert.equal(empty.rate7d, null)
    const s = summarizeAttendanceSeries([day(TODAY, { presentes: 2, tardes: 5 })], TODAY)
    assert.equal(s.today?.late, 2)
    assert.equal(s.today?.onTime, 0)
  })

  it('keeps only the last N work days', () => {
    const rows = Array.from({ length: 40 }, (_, i) => day(addDays(TODAY, -i), {}))
    assert.equal(summarizeAttendanceSeries(rows, TODAY, 30).series.length, 30)
  })
})

describe('summarizeToday', () => {
  const employeeDept = new Map<string, string | null>([
    ['a', 'd1'], ['b', 'd1'], ['c', 'd2'], ['d', null],
  ])
  const deptNames = new Map([['d1', 'Operaciones'], ['d2', 'Bodega']])
  const rows = [
    { id: 'a', name: 'Ana', status: 'present', late_minutes: 0, check_in: '2026-10-08T13:00:00Z' },
    { id: 'b', name: 'Beto', status: 'late', late_minutes: 18, check_in: '2026-10-08T13:18:00Z' },
    { id: 'c', name: 'Carla', status: 'absent', late_minutes: null, check_in: null },
    { id: 'd', name: 'Dani', status: 'paid_leave', late_minutes: null, check_in: null },
    { id: 'x', name: 'Fuera de alcance', status: 'absent', late_minutes: null, check_in: null },
  ]

  it('orders missing people absent → late → leave and ignores out-of-scope rows', () => {
    const t = summarizeToday(rows, employeeDept, deptNames)
    assert.deepEqual(t.missingToday.map((m) => m.status), ['absent', 'late', 'paid_leave'])
    assert.equal(t.missingTodayTotal, 3)
    assert.equal(t.missingToday[1].departmentName, 'Operaciones')
    assert.equal(t.avgLateMinutesToday, 18)
  })

  it('builds department summaries with names instead of ids', () => {
    const t = summarizeToday(rows, employeeDept, deptNames)
    const depts = buildDepartmentSummaries(
      [{ department_id: 'd1' }, { department_id: 'd1' }, { department_id: 'd2' }, { department_id: null }],
      [{ id: 'd1', name: 'Operaciones' }, { id: 'd2', name: 'Bodega' }],
      t.byDept
    )
    assert.deepEqual(depts[0], {
      id: 'd1', name: 'Operaciones', headcount: 2, scheduledToday: 2, presentToday: 2, attendancePct: 100,
    })
    assert.equal(depts.find((d) => d.id === 'd2')?.attendancePct, 0)
    assert.equal(depts.find((d) => d.id === null)?.name, 'Sin departamento')
  })
})

describe('payroll runs', () => {
  const run = (id: string, p: Partial<RunRow>): RunRow => ({
    id, year: 2026, month: 10, quincena: 1, tipo: 'CON', status: 'draft',
    created_at: '2026-10-01T00:00:00Z', authorized_at: null, ...p,
  })

  it('labels quincenas and monthly runs in Spanish', () => {
    assert.equal(payrollRunLabel({ year: 2026, month: 10, quincena: 1 }), '1.ª quincena octubre 2026')
    assert.equal(payrollRunLabel({ year: 2026, month: 9, quincena: 2 }), '2.ª quincena septiembre 2026')
    assert.equal(payrollRunLabel({ year: 2026, month: 9, quincena: null }), 'Septiembre 2026')
  })

  it('keeps one run per period, preferring the most advanced status', () => {
    const runs = latestRunPerPeriod([
      run('old-draft', { created_at: '2026-10-01T00:00:00Z' }),
      run('new-draft', { created_at: '2026-10-03T00:00:00Z' }),
      run('sep2-auth', { month: 9, quincena: 2, status: 'authorized' }),
      run('sep2-draft', { month: 9, quincena: 2, created_at: '2026-10-05T00:00:00Z' }),
    ])
    assert.deepEqual(runs.map((r) => r.id), ['new-draft', 'sep2-auth'])
  })

  it('hides net amounts without salary access', () => {
    const totals = summarizeRunLines([
      { run_id: 'r', eff_bruto: '1000', eff_neto: '870.5' },
      { run_id: 'r', eff_bruto: 500, eff_neto: 400 },
    ])
    const r = run('r', {})
    assert.equal(summarizeRuns([r], totals, true)[0].net, 1270.5)
    assert.equal(summarizeRuns([r], totals, false)[0].net, null)
    assert.equal(summarizeRuns([r], totals, false)[0].employeeCount, 2)
  })

  it('cost trend sums only authorized runs per month and fills empty months', () => {
    const runs = [
      run('a1', { month: 9, quincena: 1, status: 'authorized' }),
      run('a2', { month: 9, quincena: 2, status: 'authorized' }),
      run('d', { month: 10, quincena: 1, status: 'draft' }),
    ]
    const totals = new Map([
      ['a1', { gross: 1000, net: 870 }],
      ['a2', { gross: 1000, net: 870 }],
      ['d', { gross: 999, net: 999 }],
    ])
    const trend = buildCostTrend(runs, totals, TODAY, 6)
    assert.deepEqual(trend.map((p) => p.period), ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'])
    assert.deepEqual(trend[4], { period: '2026-09', gross: 2000, net: 1740, deductions: 260 })
    assert.equal(trend[5].gross, 0)
  })

  it('cost trend crosses the year boundary', () => {
    assert.deepEqual(buildCostTrend([], new Map(), '2026-02-10', 3).map((p) => p.period), ['2025-12', '2026-01', '2026-02'])
  })
})

describe('buildCalendar', () => {
  it('merges payment, holidays, anniversaries and terminations in date order', () => {
    const events = buildCalendar({
      today: TODAY,
      nextPayment: { periodStart: '2026-10-01', periodEnd: '2026-10-15' },
      holidays: [{ date: '2026-12-25', name: 'Navidad' }, { date: '2026-01-01', name: 'Año Nuevo' }],
      employees: [
        { name: 'Ana', hire_date: '2021-10-20', termination_date: null },
        { name: 'Nuevo', hire_date: '2026-10-20', termination_date: null }, // 0 años: no aparece
        { name: 'Luis', hire_date: '2025-01-10', termination_date: '2026-10-31' },
      ],
      horizonDays: 90,
    })
    assert.deepEqual(events.map((e) => [e.date, e.kind]), [
      ['2026-10-15', 'payment'],
      ['2026-10-20', 'anniversary'],
      ['2026-10-31', 'termination'],
      ['2026-12-25', 'holiday'],
    ])
    assert.equal(events[1].subtitle, '5 años en la empresa')
  })

  it('maps a Feb 29 hire date to Feb 28 in non-leap years', () => {
    const events = buildCalendar({
      today: '2027-02-01',
      employees: [{ name: 'Bisiesto', hire_date: '2024-02-29', termination_date: null }],
    })
    assert.equal(events[0]?.date, '2027-02-28')
  })
})

describe('buildPendingItems', () => {
  it('sorts by severity and escalates a run close to pay date', () => {
    const items = buildPendingItems({
      today: TODAY,
      corrections: 2,
      leave: { count: 4, oldestCreatedAt: '2026-10-05T15:00:00Z' },
      openPunches: { date: '2026-10-07', count: 3 },
      unauthorizedRun: { label: '1.ª quincena octubre 2026', status: 'edited', payDate: '2026-10-10' },
      terminations: null,
    })
    assert.deepEqual(items.map((i) => i.id), ['open_punches', 'payroll_run', 'leave_requests', 'corrections'])
    assert.equal(items[0].when, 'Ayer')
    assert.equal(items[1].severity, 'urgent')
    assert.equal(items[1].when, 'Paga en 2 días')
    assert.equal(items[2].when, 'La más antigua: hace 3 días')
  })

  it('omits empty blocks', () => {
    assert.deepEqual(buildPendingItems({ today: TODAY, corrections: 0, leave: { count: 0, oldestCreatedAt: null } }), [])
  })
})

describe('attendance_daily_kpis migration', () => {
  const sql = readFileSync(
    join(__dirname, '..', 'supabase', 'migrations', '20261008160000_attendance_daily_kpis.sql'),
    'utf8'
  )
  it('checks company membership before returning data', () => {
    assert.match(sql, /p_company_id IS DISTINCT FROM public\.get_user_company\(\)/)
    assert.match(sql, /ERRCODE = '42501'/)
  })
  it('keeps the same attendance rules as attendance_kpis_filtered', () => {
    assert.match(sql, /is_work_day_for_employee/)
    assert.match(sql, /employee_has_approved_paid_leave_on_date/)
    assert.match(sql, /late_minutes > 5/)
  })
})
