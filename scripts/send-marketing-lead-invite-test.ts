/**
 * One-off test: send lead_invite email (dry-run off).
 * Usage: railway run npx tsx scripts/send-marketing-lead-invite-test.ts
 *    or: npx tsx scripts/send-marketing-lead-invite-test.ts  (with env vars set)
 */

import { createClient } from '@supabase/supabase-js'
import { sendMarketingLeadInviteEmail } from '../lib/emails/marketing-lead-invite'

const TEST_EMAIL = 'jorge7gomez@gmail.com'

async function main() {
  let unsubscribeToken: string | undefined

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (supabaseUrl && serviceKey) {
    const supabase = createClient(supabaseUrl, serviceKey)
    const { data } = await supabase
      .from('marketing_leads')
      .select('unsubscribe_token')
      .eq('email', TEST_EMAIL.toLowerCase())
      .maybeSingle()

    unsubscribeToken = data?.unsubscribe_token ?? undefined
  }

  const result = await sendMarketingLeadInviteEmail({
    to: TEST_EMAIL,
    nombre: 'Jorge',
    unsubscribeToken,
    dryRun: false,
  })

  if (result.skipped) {
    console.log('Skipped (dry run env flag)')
    process.exit(1)
  }

  console.log('Sent lead_invite to', TEST_EMAIL, result.id ? `id=${result.id}` : '')
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err)
  console.error('Failed:', message)
  process.exit(1)
})
