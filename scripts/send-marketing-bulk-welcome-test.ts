/**
 * Test: bulk-manual Welcome (Step 0) with "Hola {nombre}, me dejaste en el olvido."
 * Usage: railway run npx tsx scripts/send-marketing-bulk-welcome-test.ts
 */

import { createClient } from '@supabase/supabase-js'
import { sendBulkManualWelcomeEmail } from '../lib/emails/marketing-bulk-manual-welcome'
import { generateUnsubscribeToken } from '../lib/marketing/unsubscribe'

const TEST_EMAIL = 'jorge7gomez@gmail.com'

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

  const result = await sendBulkManualWelcomeEmail({
    to: TEST_EMAIL,
    nombre: 'Jorge',
    unsubscribeToken,
    dryRun: false,
  })

  if (result.skipped) {
    console.log('Skipped (dry run env flag)')
    process.exit(1)
  }

  console.log('Sent bulk-manual Welcome (Step 0) to', TEST_EMAIL)
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err)
  console.error('Failed:', message)
  process.exit(1)
})
