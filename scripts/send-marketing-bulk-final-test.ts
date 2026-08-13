/**
 * Final test: both manual bulk emails to one address.
 * 1) HTML lead_invite
 * 2) Text bulk-manual Welcome (Step 0)
 * Usage: railway run npx tsx scripts/send-marketing-bulk-final-test.ts
 */

import { createClient } from '@supabase/supabase-js'
import { sendBulkManualWelcomeEmail } from '../lib/emails/marketing-bulk-manual-welcome'
import { sendMarketingLeadInviteEmail } from '../lib/emails/marketing-lead-invite'
import { generateUnsubscribeToken } from '../lib/marketing/unsubscribe'

const TEST_EMAIL = 'jorge7gomez@gmail.com'
const TEST_NOMBRE = 'Jorge'

async function main() {
  let unsubscribeToken = generateUnsubscribeToken()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (supabaseUrl && serviceKey) {
    const supabase = createClient(supabaseUrl, serviceKey)
    const { data } = await supabase
      .from('marketing_leads')
      .select('unsubscribe_token')
      .eq('email', TEST_EMAIL.toLowerCase())
      .maybeSingle()

    if (data?.unsubscribe_token) {
      unsubscribeToken = data.unsubscribe_token
    }
  }

  const invite = await sendMarketingLeadInviteEmail({
    to: TEST_EMAIL,
    nombre: TEST_NOMBRE,
    unsubscribeToken,
    dryRun: false,
  })

  if (invite.skipped) {
    console.log('Invite skipped (dry run env flag)')
    process.exit(1)
  }

  console.log('1/2 Sent lead_invite', invite.id ? `id=${invite.id}` : '')

  const welcome = await sendBulkManualWelcomeEmail({
    to: TEST_EMAIL,
    nombre: TEST_NOMBRE,
    unsubscribeToken,
    dryRun: false,
  })

  if (welcome.skipped) {
    console.log('Welcome skipped (dry run env flag)')
    process.exit(1)
  }

  console.log('2/2 Sent bulk-manual Welcome (Step 0)')
  console.log('Done →', TEST_EMAIL)
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err)
  console.error('Failed:', message)
  process.exit(1)
})
