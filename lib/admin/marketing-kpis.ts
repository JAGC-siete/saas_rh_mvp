import type { SupabaseClient } from '@supabase/supabase-js'
import { DateTime } from 'luxon'
import {
  isViernesLeadEntry,
  normalizeLeadSource,
  SEQUENCE_COMPLETE_STEP,
  type LeadSourceKind,
} from '../marketing/email-sequence-ledger'
import { HONDURAS_TIMEZONE } from '../timezone'
import { fetchCommercialStats, type CommercialStats } from './system-stats'

export const MARKETING_KPI_DAYS = [7, 30, 90] as const
export type MarketingKpiDays = (typeof MARKETING_KPI_DAYS)[number]

export type MarketingLeadRow = {
  id: string
  source: string | null
  status: string
  current_step: number
  created_at: string
}

export type MarketingEmailLedgerRow = {
  step: number
}

export type LeadsByKind = Record<LeadSourceKind, number>

export type LeadsByStatus = {
  active: number
  completed: number
  unsubscribed: number
  total: number
}

export type DailyLeadPoint = {
  date: string
  total: number
}

export type MarketingKpisPayload = {
  range: {
    days: MarketingKpiDays
    since: string
  }
  leads: {
    total: number
    byKind: LeadsByKind
    viernesLeads: number
    byStatus: LeadsByStatus
  }
  sequence: {
    awaitingWatchman: number
  }
  email: {
    sentInRange: number
    byStep: Record<string, number>
  }
  commercial: CommercialStats
  /** Commercial quote conversion window is fixed at 30 days in system-stats. */
  commercialWindowDays: 30
  dailySeries: DailyLeadPoint[]
}

export function parseMarketingKpiDays(raw: unknown): MarketingKpiDays {
  const n = typeof raw === 'string' ? Number.parseInt(raw, 10) : typeof raw === 'number' ? raw : NaN
  if (n === 7 || n === 30 || n === 90) return n
  return 30
}

export function marketingKpiSinceIso(days: MarketingKpiDays, now = DateTime.now()): string {
  return now.setZone(HONDURAS_TIMEZONE).minus({ days }).toUTC().toISO()!
}

export function emptyLeadsByKind(): LeadsByKind {
  return { activar: 0, ventas: 0, info: 0, suscripcion: 0 }
}

export function aggregateLeadsInRange(rows: MarketingLeadRow[]): {
  total: number
  byKind: LeadsByKind
  viernesLeads: number
  byStatus: LeadsByStatus
} {
  const byKind = emptyLeadsByKind()
  const byStatus: LeadsByStatus = {
    active: 0,
    completed: 0,
    unsubscribed: 0,
    total: rows.length,
  }
  let viernesLeads = 0

  for (const row of rows) {
    const kind = normalizeLeadSource(row.source)
    byKind[kind] += 1
    if (isViernesLeadEntry(row.source)) viernesLeads += 1

    if (row.status === 'active') byStatus.active += 1
    else if (row.status === 'completed') byStatus.completed += 1
    else if (row.status === 'unsubscribed') byStatus.unsubscribed += 1
  }

  return { total: rows.length, byKind, viernesLeads, byStatus }
}

export function buildDailyLeadSeries(
  rows: MarketingLeadRow[],
  days: MarketingKpiDays,
  now = DateTime.now()
): DailyLeadPoint[] {
  const zoneNow = now.setZone(HONDURAS_TIMEZONE).startOf('day')
  const counts = new Map<string, number>()

  for (let i = days - 1; i >= 0; i -= 1) {
    const key = zoneNow.minus({ days: i }).toFormat('yyyy-MM-dd')
    counts.set(key, 0)
  }

  for (const row of rows) {
    if (!row.created_at) continue
    const created = DateTime.fromISO(row.created_at, { zone: 'utc' }).setZone(HONDURAS_TIMEZONE)
    if (!created.isValid) continue
    const key = created.toFormat('yyyy-MM-dd')
    if (counts.has(key)) {
      counts.set(key, (counts.get(key) || 0) + 1)
    }
  }

  return Array.from(counts.entries()).map(([date, total]) => ({ date, total }))
}

export function aggregateEmailLedgerByStep(rows: MarketingEmailLedgerRow[]): {
  sentInRange: number
  byStep: Record<string, number>
} {
  const byStep: Record<string, number> = {}
  for (const row of rows) {
    const key = String(row.step)
    byStep[key] = (byStep[key] || 0) + 1
  }
  return { sentInRange: rows.length, byStep }
}

export function countAwaitingWatchman(
  rows: Array<{ status: string; current_step: number }>
): number {
  return rows.filter(
    (l) =>
      l.status === 'active' &&
      l.current_step >= 1 &&
      l.current_step < SEQUENCE_COMPLETE_STEP
  ).length
}

/**
 * Load marketing conversion KPIs for super-admin (counts only; no PII).
 */
export async function fetchMarketingKpis(
  supabase: SupabaseClient,
  days: MarketingKpiDays
): Promise<MarketingKpisPayload> {
  const since = marketingKpiSinceIso(days)

  const [leadsResult, ledgerResult, activeWatchmanResult, commercial] = await Promise.all([
    supabase
      .from('marketing_leads')
      .select('id, source, status, current_step, created_at')
      .gte('created_at', since),
    supabase.from('marketing_email_ledger').select('step').gte('sent_at', since),
    supabase
      .from('marketing_leads')
      .select('status, current_step')
      .eq('status', 'active')
      .gte('current_step', 1)
      .lt('current_step', SEQUENCE_COMPLETE_STEP),
    fetchCommercialStats(supabase),
  ])

  if (leadsResult.error) {
    throw new Error(`marketing_leads: ${leadsResult.error.message}`)
  }
  if (ledgerResult.error) {
    throw new Error(`marketing_email_ledger: ${ledgerResult.error.message}`)
  }
  if (activeWatchmanResult.error) {
    throw new Error(`marketing_leads(watchman): ${activeWatchmanResult.error.message}`)
  }

  const leadRows = (leadsResult.data || []) as MarketingLeadRow[]
  const ledgerRows = (ledgerResult.data || []) as MarketingEmailLedgerRow[]
  const watchmanRows = (activeWatchmanResult.data || []) as Array<{
    status: string
    current_step: number
  }>

  const leads = aggregateLeadsInRange(leadRows)
  const email = aggregateEmailLedgerByStep(ledgerRows)

  return {
    range: { days, since },
    leads: {
      total: leads.total,
      byKind: leads.byKind,
      viernesLeads: leads.viernesLeads,
      byStatus: leads.byStatus,
    },
    sequence: {
      awaitingWatchman: countAwaitingWatchman(watchmanRows),
    },
    email,
    commercial,
    commercialWindowDays: 30,
    dailySeries: buildDailyLeadSeries(leadRows, days),
  }
}
