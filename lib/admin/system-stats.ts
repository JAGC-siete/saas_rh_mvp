import type { SupabaseClient } from '@supabase/supabase-js'
import { DateTime } from 'luxon'
import { PAID_PLAN_TYPES, TRIAL_PLAN_TYPE } from '../billing/plans'
import { HONDURAS_TIMEZONE } from '../timezone'
import { getVentasBankDetailsFromEnv } from '../ventas/bank-details'

export type SystemHealthStatus = 'healthy' | 'warning' | 'critical'
export type ServiceStatus = 'operational' | 'degraded' | 'offline' | 'unknown'

export interface PlatformServiceStatus {
  database: ServiceStatus
  apis: ServiceStatus
  authentication: ServiceStatus
  reports: ServiceStatus
}

export interface VentasBankConfigStatus {
  configured: boolean
  hasClientName: boolean
  hasClientDni: boolean
  hasBacAccount: boolean
  hasBanpaisAccount: boolean
  hasAtlantidaAccount: boolean
}

export interface CommercialStats {
  /** false si la migración unify_quote_billing aún no está aplicada */
  available: boolean
  quotesSent30d: number
  quotesPendingPayment: number
  quotesDepositReceived30d: number
  pipelineQuotedTotalHnl: number
  depositsMonthCount: number
  depositsMonthTotalHnl: number
  quotesWithoutCompany: number
  paymentsWithoutQuote: number
  /** 0–100; null si no hubo cotizaciones enviadas en 30d */
  conversionRate30d: number | null
}

export interface TenantStats {
  /** Empresas is_active con plan de paga (basic/premium/enterprise) */
  paidActiveCompanies: number
  /** Empresas is_active con plan trial */
  trialCompanies: number
  /** Empresas con is_active=false */
  inactiveCompanies: number
  /** Empleados status=active en empresas de paga activas */
  paidActiveEmployees: number
  /** Empleados status=active en empresas trial activas */
  trialEmployees: number
}

export interface SystemStatsPayload {
  totalCompanies: number
  totalUsers: number
  /** Alias de paidActiveEmployees (clientes de paga; excluye trial) */
  totalEmployees: number
  /** Alias de paidActiveCompanies (de paga; excluye trial) */
  activeCompanies: number
  inactiveCompanies: number
  tenants: TenantStats
  totalRevenue: number
  monthlyRevenue: number
  systemHealth: SystemHealthStatus
  lastBackup: string | null
  serverUptime: string
  services: PlatformServiceStatus
  revenueSource: 'manual_payments'
  commercial: CommercialStats
  ventasBank: VentasBankConfigStatus
}

async function fetchActiveCompanyIds(
  supabase: SupabaseClient,
  segment: 'paid' | 'trial'
): Promise<string[]> {
  let query = supabase.from('companies').select('id').eq('is_active', true)
  query =
    segment === 'paid'
      ? query.in('plan_type', [...PAID_PLAN_TYPES])
      : query.eq('plan_type', TRIAL_PLAN_TYPE)

  const { data, error } = await query
  if (error) throw new Error(`companies(${segment}): ${error.message}`)
  return (data || []).map((row) => row.id as string)
}

async function countActiveEmployeesForCompanies(
  supabase: SupabaseClient,
  companyIds: string[]
): Promise<number> {
  if (companyIds.length === 0) return 0
  return countRows(supabase, 'employees', (q) =>
    q.eq('status', 'active').in('company_id', companyIds)
  )
}

async function fetchTenantStats(supabase: SupabaseClient): Promise<TenantStats> {
  const [paidCompanyIds, trialCompanyIds, inactiveCompanies] = await Promise.all([
    fetchActiveCompanyIds(supabase, 'paid'),
    fetchActiveCompanyIds(supabase, 'trial'),
    countRows(supabase, 'companies', (q) => q.eq('is_active', false)),
  ])

  const [paidActiveEmployees, trialEmployees] = await Promise.all([
    countActiveEmployeesForCompanies(supabase, paidCompanyIds),
    countActiveEmployeesForCompanies(supabase, trialCompanyIds),
  ])

  return {
    paidActiveCompanies: paidCompanyIds.length,
    trialCompanies: trialCompanyIds.length,
    inactiveCompanies,
    paidActiveEmployees,
    trialEmployees,
  }
}

async function countRows(
  supabase: SupabaseClient,
  table: string,
  filter?: (query: any) => any
): Promise<number> {
  let query: any = supabase.from(table).select('*', { count: 'exact', head: true })
  if (filter) query = filter(query)
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

function thirtyDaysAgoIso(): string {
  return DateTime.now().setZone(HONDURAS_TIMEZONE).minus({ days: 30 }).toUTC().toISO()!
}

export function computeConversionRate30d(converted: number, sent: number): number | null {
  if (sent <= 0) return null
  return Math.round((converted / sent) * 1000) / 10
}

export function getVentasBankConfigStatus(): VentasBankConfigStatus {
  const bank = getVentasBankDetailsFromEnv()
  const hasBac = !!(bank?.bacAccount?.trim())
  const hasBanpais = !!(bank?.banpaisAccount?.trim())
  const hasAtlantida = !!(bank?.atlantidaAccount?.trim())
  return {
    configured: !!(bank && (hasBac || hasBanpais || hasAtlantida)),
    hasClientName: !!(bank?.clientName?.trim()),
    hasClientDni: !!(bank?.clientDni?.trim()),
    hasBacAccount: hasBac,
    hasBanpaisAccount: hasBanpais,
    hasAtlantidaAccount: hasAtlantida,
  }
}

const EMPTY_COMMERCIAL: CommercialStats = {
  available: false,
  quotesSent30d: 0,
  quotesPendingPayment: 0,
  quotesDepositReceived30d: 0,
  pipelineQuotedTotalHnl: 0,
  depositsMonthCount: 0,
  depositsMonthTotalHnl: 0,
  quotesWithoutCompany: 0,
  paymentsWithoutQuote: 0,
  conversionRate30d: null,
}

async function sumColumn(
  supabase: SupabaseClient,
  table: string,
  column: string,
  filter?: (query: any) => any
): Promise<number> {
  let query: any = supabase.from(table).select(column)
  if (filter) query = filter(query)
  const { data, error } = await query
  if (error) throw error
  return (data || []).reduce((sum: number, row: any) => sum + Number(row[column] || 0), 0)
}

async function fetchCommercialStats(supabase: SupabaseClient): Promise<CommercialStats> {
  const since30d = thirtyDaysAgoIso()
  const { startIso, endIso } = monthBoundsHonduras()

  try {
    const [
      quotesSent30d,
      quotesPendingPayment,
      quotesDepositReceived30d,
      pipelineQuotedTotalHnl,
      quotesWithoutCompany,
      paymentsWithoutQuote,
      depositsMonthRows,
    ] = await Promise.all([
      countRows(supabase, 'cotizaciones', (q) =>
        q.eq('status', 'sent').gte('created_at', since30d)
      ),
      countRows(supabase, 'cotizaciones', (q) =>
        q.eq('status', 'sent').in('payment_status', ['pending', 'unknown_legacy'])
      ),
      countRows(supabase, 'cotizaciones', (q) =>
        q
          .eq('status', 'sent')
          .in('payment_status', ['deposit_received', 'paid'])
          .gte('created_at', since30d)
      ),
      sumColumn(supabase, 'cotizaciones', 'expected_total_hnl', (q) =>
        q
          .eq('status', 'sent')
          .in('payment_status', ['pending', 'unknown_legacy'])
          .not('expected_total_hnl', 'is', null)
      ),
      countRows(supabase, 'cotizaciones', (q) =>
        q.eq('status', 'sent').is('company_id', null)
      ),
      countRows(supabase, 'manual_payments', (q) => q.is('quote_id', null)),
      (async () => {
        const { data, error } = await supabase
          .from('manual_payments')
          .select('amount_hnl, payment_kind')
          .gte('paid_at', startIso)
          .lte('paid_at', endIso)
        if (error) throw error
        const deposits = (data || []).filter(
          (row) => (row as { payment_kind?: string }).payment_kind === 'deposit'
        )
        return deposits
      })(),
    ])

    const depositsMonthTotalHnl = depositsMonthRows.reduce(
      (sum, row) => sum + Number((row as { amount_hnl?: number }).amount_hnl || 0),
      0
    )

    return {
      available: true,
      quotesSent30d,
      quotesPendingPayment,
      quotesDepositReceived30d,
      pipelineQuotedTotalHnl: Math.round(pipelineQuotedTotalHnl * 100) / 100,
      depositsMonthCount: depositsMonthRows.length,
      depositsMonthTotalHnl: Math.round(depositsMonthTotalHnl * 100) / 100,
      quotesWithoutCompany,
      paymentsWithoutQuote,
      conversionRate30d: computeConversionRate30d(quotesDepositReceived30d, quotesSent30d),
    }
  } catch (error: any) {
    const message = String(error?.message || '')
    if (
      message.includes('does not exist') ||
      message.includes('payment_status') ||
      message.includes('expected_total_hnl') ||
      message.includes('quote_id')
    ) {
      return { ...EMPTY_COMMERCIAL }
    }
    throw error
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
  const ventasBank = getVentasBankConfigStatus()

  const [
    totalCompanies,
    totalUsers,
    tenants,
    totalRevenue,
    monthlyRevenue,
    lastBackup,
    authStatus,
    reportsStatus,
    commercial,
  ] = await Promise.all([
    countRows(supabase, 'companies'),
    countRows(supabase, 'user_profiles', (q) =>
      q.in('role', ['super_admin', 'company_admin']).eq('is_active', true)
    ),
    fetchTenantStats(supabase),
    sumManualPayments(supabase),
    (async () => {
      const { startIso, endIso } = monthBoundsHonduras()
      return sumManualPayments(supabase, { fromIso: startIso, toIso: endIso })
    })(),
    fetchLastBackupDate(supabase),
    probeAuthentication(supabase),
    probeReports(supabase),
    fetchCommercialStats(supabase),
  ])

  const services: PlatformServiceStatus = {
    database: 'operational',
    apis: 'operational',
    authentication: authStatus,
    reports: reportsStatus,
  }

  let systemHealth = deriveSystemHealth(services)
  if (!ventasBank.configured || !commercial.available) {
    systemHealth = systemHealth === 'critical' ? 'critical' : 'warning'
  }

  return {
    totalCompanies,
    totalUsers,
    totalEmployees: tenants.paidActiveEmployees,
    activeCompanies: tenants.paidActiveCompanies,
    inactiveCompanies: tenants.inactiveCompanies,
    tenants,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
    systemHealth,
    lastBackup,
    serverUptime: formatProcessUptime(),
    services,
    revenueSource: 'manual_payments',
    commercial,
    ventasBank,
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
