import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { DateTime } from 'luxon'

import {
  aggregateEmailLedgerByStep,
  aggregateLeadsInRange,
  buildDailyLeadSeries,
  countAwaitingWatchman,
  emptyLeadsByKind,
  parseMarketingKpiDays,
  type MarketingLeadRow,
} from '../lib/admin/marketing-kpis'
import { HONDURAS_TIMEZONE } from '../lib/timezone'

describe('admin marketing KPIs helpers', () => {
  it('parseMarketingKpiDays acepta 7/30/90 y default 30', () => {
    assert.equal(parseMarketingKpiDays('7'), 7)
    assert.equal(parseMarketingKpiDays('30'), 30)
    assert.equal(parseMarketingKpiDays(90), 90)
    assert.equal(parseMarketingKpiDays('15'), 30)
    assert.equal(parseMarketingKpiDays(undefined), 30)
    assert.equal(parseMarketingKpiDays('nope'), 30)
  })

  it('aggregateLeadsInRange agrupa por kind y marca viernes', () => {
    const rows: MarketingLeadRow[] = [
      {
        id: '1',
        source: 'activar',
        status: 'active',
        current_step: 0,
        created_at: '2026-08-01T12:00:00.000Z',
      },
      {
        id: '2',
        source: 'ventas:landing',
        status: 'completed',
        current_step: 6,
        created_at: '2026-08-01T13:00:00.000Z',
      },
      {
        id: '3',
        source: 'viernes',
        status: 'active',
        current_step: 1,
        created_at: '2026-08-01T14:00:00.000Z',
      },
      {
        id: '4',
        source: 'info',
        status: 'unsubscribed',
        current_step: 2,
        created_at: '2026-08-01T15:00:00.000Z',
      },
      {
        id: '5',
        source: null,
        status: 'active',
        current_step: 0,
        created_at: '2026-08-01T16:00:00.000Z',
      },
      {
        id: '6',
        source: 'paz',
        status: 'active',
        current_step: 0,
        created_at: '2026-08-01T17:00:00.000Z',
      },
    ]

    const result = aggregateLeadsInRange(rows)
    assert.equal(result.total, 6)
    assert.equal(result.byKind.activar, 1)
    assert.equal(result.byKind.ventas, 1)
    assert.equal(result.byKind.info, 3)
    assert.equal(result.byKind.suscripcion, 1)
    assert.equal(result.viernesLeads, 1)
    assert.equal(result.pazLeads, 1)
    assert.equal(result.byStatus.active, 4)
    assert.equal(result.byStatus.completed, 1)
    assert.equal(result.byStatus.unsubscribed, 1)
  })

  it('emptyLeadsByKind inicia en cero', () => {
    assert.deepEqual(emptyLeadsByKind(), {
      activar: 0,
      ventas: 0,
      info: 0,
      suscripcion: 0,
    })
  })

  it('buildDailyLeadSeries llena todos los días del rango en TZ Honduras', () => {
    const now = DateTime.fromISO('2026-08-10T18:00:00', { zone: HONDURAS_TIMEZONE })
    const rows: MarketingLeadRow[] = [
      {
        id: '1',
        source: 'info',
        status: 'active',
        current_step: 0,
        created_at: '2026-08-10T12:00:00.000Z',
      },
      {
        id: '2',
        source: 'activar',
        status: 'active',
        current_step: 0,
        created_at: '2026-08-09T15:00:00.000Z',
      },
    ]
    const series = buildDailyLeadSeries(rows, 7, now)
    assert.equal(series.length, 7)
    assert.equal(series[0].date, '2026-08-04')
    assert.equal(series[series.length - 1].date, '2026-08-10')
    const day10 = series.find((p) => p.date === '2026-08-10')
    const day9 = series.find((p) => p.date === '2026-08-09')
    assert.ok(day10 && day10.total >= 1)
    assert.ok(day9 && day9.total >= 1)
  })

  it('aggregateEmailLedgerByStep cuenta envíos por paso', () => {
    const result = aggregateEmailLedgerByStep([
      { step: 0 },
      { step: 1 },
      { step: 1 },
      { step: 2 },
    ])
    assert.equal(result.sentInRange, 4)
    assert.equal(result.byStep['0'], 1)
    assert.equal(result.byStep['1'], 2)
    assert.equal(result.byStep['2'], 1)
  })

  it('countAwaitingWatchman solo cuenta activos en pasos 1..complete-1', () => {
    assert.equal(
      countAwaitingWatchman([
        { status: 'active', current_step: 1 },
        { status: 'active', current_step: 5 },
        { status: 'active', current_step: 0 },
        { status: 'active', current_step: 6 },
        { status: 'completed', current_step: 2 },
      ]),
      2
    )
  })
})
