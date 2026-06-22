import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '../supabase/server'
import { sendLateAttendanceReportEmail } from '../emails/late-attendance-report'
import { logger } from '../logger'
import { buildCompanyPeriodConfig } from '../payroll/period-config'
import {
  getCurrentPeriod,
  getYesterdayInTimezone,
  isPeriodEndDate,
} from '../payroll/period-dates'
import type {
  LateAttendanceReportData,
  LateReportDetail,
  LateReportEmployee,
  LateReportMetrics,
} from '../reports/late-attendance-pdf'

const REPORT_TYPE = 'late_attendance'
const DEFAULT_TZ = process.env.DEFAULT_TIMEZONE || 'America/Tegucigalpa'

export type LateAttendanceCronResult = {
  processed: number
  sent: number
  skipped: number
  errors: string[]
  dryRun: boolean
}

export type ManualLateReportOptions = {
  companyId: string
  periodStart: string
  periodEnd: string
  periodKey?: string
  force?: boolean
  dryRun?: boolean
  /** Test override: send only to these addresses instead of company admins. */
  recipientOverride?: string[]
}

type RpcReportPayload = {
  metrics: LateReportMetrics
  employees: LateReportEmployee[]
  details: LateReportDetail[]
}

async function fetchReportData(
  supabase: SupabaseClient,
  companyId: string,
  periodStart: string,
  periodEnd: string,
  timezone: string
): Promise<RpcReportPayload> {
  const { data, error } = await supabase.rpc('get_late_attendance_report', {
    p_company_id: companyId,
    p_from: periodStart,
    p_to: periodEnd,
    p_timezone: timezone,
  })

  if (error) throw new Error(error.message)

  const payload = (data ?? {}) as RpcReportPayload
  return {
    metrics: payload.metrics ?? {
      total_attendance_records: 0,
      total_late_incidents: 0,
      employees_with_late: 0,
      active_employees: 0,
    },
    employees: payload.employees ?? [],
    details: payload.details ?? [],
  }
}

async function getReportRecipientEmails(
  supabase: SupabaseClient,
  companyId: string
): Promise<string[]> {
  const { data: profiles, error } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('company_id', companyId)
    .in('role', ['company_admin', 'hr_manager'])
    .eq('is_active', true)

  if (error) throw new Error(error.message)

  const emails = new Set<string>()
  for (const profile of profiles ?? []) {
    const { data: authData, error: authErr } = await supabase.auth.admin.getUserById(profile.id)
    if (authErr) {
      logger.warn('Late report: could not resolve admin email', {
        companyId,
        userId: profile.id,
        error: authErr.message,
      })
      continue
    }
    const email = authData?.user?.email?.trim()
    if (email) emails.add(email)
  }
  return [...emails]
}

async function wasReportAlreadySent(
  supabase: SupabaseClient,
  companyId: string,
  periodKey: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('cron_report_ledger')
    .select('id')
    .eq('company_id', companyId)
    .eq('report_type', REPORT_TYPE)
    .eq('period_key', periodKey)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return !!data
}

async function recordReportSent(
  supabase: SupabaseClient,
  companyId: string,
  periodKey: string,
  periodStart: string,
  periodEnd: string,
  recipientCount: number
): Promise<void> {
  const { error } = await supabase.from('cron_report_ledger').insert({
    company_id: companyId,
    report_type: REPORT_TYPE,
    period_key: periodKey,
    period_start: periodStart,
    period_end: periodEnd,
    recipient_count: recipientCount,
  })

  if (error) throw new Error(error.message)
}

export async function sendLateAttendanceReportForCompany(
  supabase: SupabaseClient,
  opts: ManualLateReportOptions & { companyName: string; timezone: string }
): Promise<{ sent: boolean; recipientCount: number; reason?: string }> {
  const periodKey =
    opts.periodKey ??
    `${opts.periodStart}_${opts.periodEnd}`

  if (!opts.force) {
    const already = await wasReportAlreadySent(supabase, opts.companyId, periodKey)
    if (already) {
      return { sent: false, recipientCount: 0, reason: 'already_sent' }
    }
  }

  const reportPayload = await fetchReportData(
    supabase,
    opts.companyId,
    opts.periodStart,
    opts.periodEnd,
    opts.timezone
  )

  const reportData: LateAttendanceReportData = {
    companyName: opts.companyName,
    companyId: opts.companyId,
    periodStart: opts.periodStart,
    periodEnd: opts.periodEnd,
    metrics: reportPayload.metrics,
    employees: reportPayload.employees,
    details: reportPayload.details,
    timeZone: opts.timezone,
  }

  const recipients =
    opts.recipientOverride && opts.recipientOverride.length > 0
      ? opts.recipientOverride
      : await getReportRecipientEmails(supabase, opts.companyId)
  if (recipients.length === 0) {
    return { sent: false, recipientCount: 0, reason: 'no_recipients' }
  }

  if (opts.dryRun) {
    logger.info('Late report dry run', {
      companyId: opts.companyId,
      periodKey,
      recipients,
      incidents: reportPayload.metrics.total_late_incidents,
    })
    return { sent: true, recipientCount: recipients.length, reason: 'dry_run' }
  }

  for (const to of recipients) {
    await sendLateAttendanceReportEmail(to, reportData)
  }

  if (!opts.force) {
    await recordReportSent(
      supabase,
      opts.companyId,
      periodKey,
      opts.periodStart,
      opts.periodEnd,
      recipients.length
    )
  }

  return { sent: true, recipientCount: recipients.length }
}

export async function runLateAttendanceReportCron(
  referenceDate: Date = new Date()
): Promise<LateAttendanceCronResult> {
  const dryRun = process.env.LATE_REPORT_DRY_RUN === 'true'
  const supabase = createAdminClient()
  const result: LateAttendanceCronResult = {
    processed: 0,
    sent: 0,
    skipped: 0,
    errors: [],
    dryRun,
  }

  const { data: companies, error: companiesError } = await supabase
    .from('companies')
    .select('id, name, timezone, is_active')
    .eq('is_active', true)

  if (companiesError) {
    throw new Error(companiesError.message)
  }

  for (const company of companies ?? []) {
    result.processed += 1
    const tz = company.timezone || DEFAULT_TZ
    const yesterday = getYesterdayInTimezone(tz, referenceDate)

    const { data: payrollConfig } = await supabase
      .from('company_payroll_configs')
      .select('payment_frequency, quincena_config, metadata')
      .eq('company_id', company.id)
      .eq('is_active', true)
      .maybeSingle()

    const periodConfig = buildCompanyPeriodConfig(payrollConfig)
    if (!isPeriodEndDate(periodConfig, yesterday)) {
      result.skipped += 1
      continue
    }

    const [y, m, d] = yesterday.split('-').map(Number)
    const period = getCurrentPeriod(periodConfig, new Date(y, m - 1, d, 12, 0, 0))

    try {
      const sendResult = await sendLateAttendanceReportForCompany(supabase, {
        companyId: company.id,
        companyName: company.name,
        timezone: tz,
        periodStart: period.fechaInicio,
        periodEnd: period.fechaFin,
        periodKey: period.periodKey,
        dryRun,
      })

      if (sendResult.sent) {
        result.sent += 1
        logger.info('Late attendance report sent', {
          companyId: company.id,
          periodKey: period.periodKey,
          recipients: sendResult.recipientCount,
          dryRun,
        })
      } else {
        result.skipped += 1
        logger.info('Late attendance report skipped', {
          companyId: company.id,
          periodKey: period.periodKey,
          reason: sendResult.reason,
        })
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      result.errors.push(`${company.id}: ${msg}`)
      logger.error('Late attendance report failed', { companyId: company.id, error: msg })
    }
  }

  return result
}
