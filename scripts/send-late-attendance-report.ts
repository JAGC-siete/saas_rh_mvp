/**
 * Manual send / backfill for late attendance report.
 *
 * Usage:
 *   railway run npx tsx scripts/send-late-attendance-report.ts \
 *     --company 7a0278af-4c01-4dfb-a098-7fb2b8090d3f \
 *     --from 2026-06-01 --to 2026-06-21
 *
 * Options:
 *   --force     Skip ledger check (allow resend)
 *   --dry-run   Log only, no email
 *   --email     Send only to this address (test override; skips real admins)
 */

import { createClient } from '@supabase/supabase-js'
import { sendLateAttendanceReportForCompany } from '../lib/cron/late-attendance-report'

function parseArgs(argv: string[]) {
  const get = (flag: string) => {
    const i = argv.indexOf(flag)
    return i >= 0 ? argv[i + 1] : undefined
  }
  return {
    companyId: get('--company'),
    from: get('--from'),
    to: get('--to'),
    email: get('--email'),
    force: argv.includes('--force'),
    dryRun: argv.includes('--dry-run'),
  }
}

async function run(): Promise<void> {
  const { companyId, from, to, email, force, dryRun } = parseArgs(process.argv.slice(2))

  if (!companyId || !from || !to) {
    console.error(
      'Usage: npx tsx scripts/send-late-attendance-report.ts --company <uuid> --from YYYY-MM-DD --to YYYY-MM-DD [--force] [--dry-run]'
    )
    process.exit(1)
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  if (dryRun) process.env.LATE_REPORT_DRY_RUN = 'true'

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id, name, timezone')
    .eq('id', companyId)
    .single()

  if (companyError || !company) {
    console.error('Company not found:', companyError?.message ?? companyId)
    process.exit(1)
  }

  const recipientOverride = email?.trim()
    ? [email.trim().toLowerCase()]
    : undefined

  const result = await sendLateAttendanceReportForCompany(supabase, {
    companyId: company.id,
    companyName: company.name,
    timezone: company.timezone || process.env.DEFAULT_TIMEZONE || 'America/Tegucigalpa',
    periodStart: from,
    periodEnd: to,
    periodKey: `${from}_${to}`,
    force: force || !!recipientOverride,
    dryRun,
    recipientOverride,
  })

  console.log(JSON.stringify(result, null, 2))
  if (!result.sent && result.reason !== 'dry_run') process.exit(1)
}

run()
