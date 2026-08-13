/**
 * Resend the /info "info pack" email to existing marketing leads.
 *
 * Usage:
 *   railway run npx tsx scripts/resend-info-pack.ts <email> [email...]
 */

import { createClient } from '@supabase/supabase-js'
import { sendInfoPackEmail } from '../lib/marketing/info-pack-email'

type LeadRow = {
  id: string
  email: string
  full_name: string | null
  unsubscribe_token: string
  source: string | null
}

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase()
}

async function run(): Promise<void> {
  const rawEmails = process.argv.slice(2).filter(Boolean)
  if (rawEmails.length === 0) {
    console.error('Usage: npx tsx scripts/resend-info-pack.ts <email> [email...]')
    process.exit(1)
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing env vars: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const emails = Array.from(new Set(rawEmails.map(normalizeEmail)))
  let ok = 0
  let fail = 0

  for (const email of emails) {
    try {
      const { data, error } = await supabase
        .from('marketing_leads')
        .select('id, email, full_name, unsubscribe_token, source')
        .eq('email', email)
        .maybeSingle()

      if (error) throw new Error(error.message)
      if (!data) throw new Error('Lead not found')

      const lead = data as LeadRow

      await sendInfoPackEmail({
        to: lead.email,
        nombre: lead.full_name,
        unsubscribeToken: lead.unsubscribe_token,
      })

      console.log(`OK  resent info pack  ${lead.email}`)
      ok += 1
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error(`FAIL  ${email}  (${msg})`)
      fail += 1
    }
  }

  console.log(`\nDone. OK=${ok} FAIL=${fail}`)
  if (fail > 0) process.exit(1)
}

run()

