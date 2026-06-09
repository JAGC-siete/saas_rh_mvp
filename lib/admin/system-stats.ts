import type { SupabaseClient } from '@supabase/supabase-js'
import { DateTime } from 'luxon'
import { HONDURAS_TIMEZONE } from '../timezone'

export type SystemHealthStatus = 'healthy' | 'warning' | 'critical'
export type ServiceStatus = 'operational' | 'degraded' | 'offline' | 'unknown'

export interface PlatformServiceStatus {
  database: ServiceStatus
  apis: ServiceStatus
  authentication: ServiceStatus
  reports: ServiceStatus
}

export interface SystemStatsPayload {
  totalCompanies: number
  totalUsers: number
  totalEmployees: number
  activeCompanies: number
  inactiveCompanies: number
  totalRevenue: number
  monthlyRevenue: number
  systemHealth: SystemHealthStatus
  lastBackup: string | null
  serverUptime: string
  services: PlatformServiceStatus
  revenueSource: 'manual_payments'
}

async function countRows(
  supabase: SupabaseClient,
  table: string,
  filter?: (query: ReturnType<SupabaseClient['from']>) => ReturnType<SupabaseClient['from']>
): Promise<number> {
  let query = supabase.from(table).select('*', { count: 'exact', head: true })
  if (filter) query = filter(query) as typeof query
  const { count, error } = await query
  if (error) throw new Error(`${table}: ${error.message}`)
  return count ?? 0
}

function formatProcessUptime(): string {
  const seconds = Math.floor(process.uptime())
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

function monthBoundsHonduras(): { startIso: string; endIso: string } {
  const now = DateTime.now().setZone(HONDURAS_TIMEZONE)
  const start = now.startOf('month')
  const end = now.endOf('month')
  return {
    startIso: start.toUTC().toISO()!,
    endIso: end.toUTC().toISO()!,
  }
}

async function sumManualPayments(
  supabase: SupabaseClient,
  opts?: { fromIso?: string; toIso?: string }
): Promise<number> {
  let query = supabase.from('manual_payments').select('amount_hnl')
  if (opts?.fromIso) query = query.gte('paid_at', opts.fromIso)
  if (opts?.toIso) query = query.lte('paid_at', opts.toIso)

  const { data, error } = await query
  if (error) throw new Error(`manual_payments: ${error.message}`)

  return (data || []).reduce((sum, row) => sum + Number(row.amount_hnl || 0), 0)
}

async function fetchLastBackupDate(supabase: SupabaseClient): Promise<string | null> {
  const { data, error } = await supabase
    .from('data_backups')
    .select('backup_date')
    .order('backup_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    // Tabla opcional en algunos entornos
    if (error.code === '42P01' || error.message?.includes('does not exist')) return null
    throw new Error(`data_backups: ${error.message}`)
  }

  if (!data?.backup_date) return null
  return DateTime.fromISO(data.backup_date)
    .setZone(HONDURAS_TIMEZONE)
    .toFormat('yyyy-MM-dd')
}

async function probeAuthentication(supabase: SupabaseClient): Promise<ServiceStatus> {
  try {
    const { error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 })
    if (error) return 'degraded'
    return 'operational'
  } catch {
    return 'degraded'
  }
}

async function probeReports(supabase: SupabaseClient): Promise<ServiceStatus> {
  const thirtyDaysAgo = DateTime.now().setZone(HONDURAS_TIMEZONE).minus({ days: 30 }).toUTC().toISO()!
  const { count, error } = await supabase
    .from('payroll_runs')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', thirtyDaysAgo)

  if (error) {
    if (error.code === '42P01' || error.message?.includes('does not exist')) return 'unknown'
    return 'degraded'
  }

  return (count ?? 0) > 0 ? 'operational' : 'unknown'
}

function deriveSystemHealth(services: PlatformServiceStatus): SystemHealthStatus {
  const values = Object.values(services)
  if (values.includes('offline')) return 'critical'
  if (values.includes('degraded')) return 'warning'
  if (values.every((s) => s === 'operational')) return 'healthy'
  return 'warning'
}

export async function fetchSystemStats(supabase: SupabaseClient): Promise<SystemStatsPayload> {
  const [
    totalCompanies,
    activeCompanies,
    totalUsers,
    totalEmployees,
    totalRevenue,
    monthlyRevenue,
    lastBackup,
    authStatus,
    reportsStatus,
  ] = await Promise.all([
    countRows(supabase, 'companies'),
    countRows(supabase, 'companies', (q) => q.eq('is_active', true)),
    countRows(supabase, 'user_profiles', (q) =>
      q.in('role', ['super_admin', 'company_admin']).eq('is_active', true)
    ),
    countRows(supabase, 'employees', (q) => q.eq('status', 'active')),
    sumManualPayments(supabase),
    (async () => {
      const { startIso, endIso } = monthBoundsHonduras()
      return sumManualPayments(supabase, { fromIso: startIso, toIso: endIso })
    })(),
    fetchLastBackupDate(supabase),
    probeAuthentication(supabase),
    probeReports(supabase),
  ])

  const services: PlatformServiceStatus = {
    database: 'operational',
    apis: 'operational',
    authentication: authStatus,
    reports: reportsStatus,
  }

  return {
    totalCompanies,
    totalUsers,
    totalEmployees,
    activeCompanies,
    inactiveCompanies: Math.max(0, totalCompanies - activeCompanies),
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
    systemHealth: deriveSystemHealth(services),
    lastBackup,
    serverUptime: formatProcessUptime(),
    services,
    revenueSource: 'manual_payments',
  }
}

export function serviceStatusLabel(status: ServiceStatus): string {
  switch (status) {
    case 'operational':
      return 'Operativa'
    case 'degraded':
      return 'Degradada'
    case 'offline':
      return 'Fuera de línea'
    default:
      return 'Sin datos'
  }
}

export function serviceStatusColorClass(status: ServiceStatus): string {
  switch (status) {
    case 'operational':
      return 'text-emerald-200'
    case 'degraded':
      return 'text-amber-200'
    case 'offline':
      return 'text-rose-200'
    default:
      return 'text-white/60'
  }
}
