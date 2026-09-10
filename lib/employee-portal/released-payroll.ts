import { isFrozenPayrollRunStatus } from '../payroll/resolve-effective-pay-type'
import { resolvePayrollDeductionMode } from '../payroll/deduction-mode'

/** Portal receipts: only frozen runs (authorized | distributed | paid). */
export const PORTAL_RELEASED_STATUSES = ['authorized', 'distributed', 'paid'] as const

export type PortalReleasedStatus = (typeof PORTAL_RELEASED_STATUSES)[number]

export function isPortalReleasedPayrollStatus(status: string | null | undefined): boolean {
  return isFrozenPayrollRunStatus(status)
}

export type PortalPayrollListItem = {
  runLineId: string
  year: number
  month: number
  quincena: number
  status: string
  tipo: string
  eff_bruto: number
  eff_ihss: number
  eff_rap: number
  eff_isr: number
  eff_neto: number
  eff_hours: number
  periodo: string
}

type RunJoin = {
  year: number
  month: number
  quincena: number
  status: string
  tipo?: string | null
}

type RawPortalRunLine = {
  id: string
  eff_bruto?: number | null
  eff_ihss?: number | null
  eff_rap?: number | null
  eff_isr?: number | null
  eff_neto?: number | null
  eff_hours?: number | null
  created_at?: string | null
  metadata?: Record<string, unknown> | null
  payroll_runs: RunJoin | RunJoin[] | null
}

function unwrapRun(run: RunJoin | RunJoin[] | null): RunJoin | null {
  if (!run) return null
  return Array.isArray(run) ? run[0] ?? null : run
}

export function mapReleasedRunLineToPortalItem(
  row: RawPortalRunLine,
  opts?: { companyTipo?: string }
): PortalPayrollListItem | null {
  const run = unwrapRun(row.payroll_runs)
  if (!run || !isPortalReleasedPayrollStatus(run.status)) return null
  const tipo = typeof run.tipo === 'string' ? run.tipo : ''
  if (opts?.companyTipo && tipo !== opts.companyTipo) return null
  const year = Number(run.year)
  const month = Number(run.month)
  const quincena = Number(run.quincena)
  if (!Number.isFinite(year) || !Number.isFinite(month) || ![1, 2].includes(quincena)) return null
  return {
    runLineId: row.id,
    year,
    month,
    quincena,
    status: run.status,
    tipo,
    eff_bruto: Number(row.eff_bruto) || 0,
    eff_ihss: Number(row.eff_ihss) || 0,
    eff_rap: Number(row.eff_rap) || 0,
    eff_isr: Number(row.eff_isr) || 0,
    eff_neto: Number(row.eff_neto) || 0,
    eff_hours: Number(row.eff_hours) || 0,
    periodo: `${year}-${String(month).padStart(2, '0')}`,
  }
}

/** Company canonical payroll tipo (CON / SIN / 2PAGOS) for portal list + PDF lookup. */
export async function loadCompanyPortalPayrollTipo(
  supabase: { from: (table: string) => any },
  companyId: string
): Promise<string> {
  const { data: payrollConfig } = await supabase
    .from('company_payroll_configs')
    .select('metadata, payment_frequency')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .maybeSingle()

  const metadata = (payrollConfig?.metadata as Record<string, unknown> | null) ?? {}
  const paymentFrequency =
    payrollConfig?.payment_frequency ?? (metadata.payment_frequency as string | undefined)
  return resolvePayrollDeductionMode(metadata, paymentFrequency)
}

/**
 * Find a released run line for an employee by periodo (YYYY-MM) + quincena.
 * Filters to company canonical tipo (same as send-vouchers / resolveCanonical).
 */
export async function findReleasedPortalRunLineId(
  supabase: { from: (table: string) => any },
  params: {
    companyId: string
    employeeId: string
    year: number
    month: number
    quincena: number
  }
): Promise<string | null> {
  const companyTipo = await loadCompanyPortalPayrollTipo(supabase, params.companyId)

  const { data, error } = await supabase
    .from('payroll_run_lines')
    .select(
      `
      id,
      payroll_runs!inner(
        year,
        month,
        quincena,
        status,
        tipo
      )
    `
    )
    .eq('company_id', params.companyId)
    .eq('employee_id', params.employeeId)
    .eq('payroll_runs.year', params.year)
    .eq('payroll_runs.month', params.month)
    .eq('payroll_runs.quincena', params.quincena)
    .eq('payroll_runs.tipo', companyTipo)
    .in('payroll_runs.status', [...PORTAL_RELEASED_STATUSES])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data?.id) return null
  return data.id as string
}

/**
 * Load released run line by id; null if missing, wrong owner, or not released.
 */
export async function loadOwnedReleasedRunLineId(
  supabase: { from: (table: string) => any },
  params: { companyId: string; employeeId: string; runLineId: string }
): Promise<string | null> {
  const { data, error } = await supabase
    .from('payroll_run_lines')
    .select(
      `
      id,
      employee_id,
      company_id,
      payroll_runs!inner(status)
    `
    )
    .eq('id', params.runLineId)
    .eq('company_id', params.companyId)
    .eq('employee_id', params.employeeId)
    .maybeSingle()

  if (error || !data?.id) return null
  const run = unwrapRun(data.payroll_runs as RunJoin | RunJoin[] | null)
  if (!run || !isPortalReleasedPayrollStatus(run.status)) return null
  return data.id as string
}
