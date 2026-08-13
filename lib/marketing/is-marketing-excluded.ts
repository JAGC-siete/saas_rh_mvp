import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { logger } from '../logger'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Returns true when the email belongs to a current paying customer
 * (see view marketing_current_customer_contacts).
 */
export async function isMarketingExcluded(
  email: string,
  client: SupabaseClient = supabaseAdmin
): Promise<boolean> {
  const normalized = email.trim().toLowerCase()
  if (!normalized) return false

  const { data, error } = await client
    .from('marketing_current_customer_contacts')
    .select('email')
    .eq('email', normalized)
    .maybeSingle()

  if (error) {
    logger.warn('Could not check marketing customer exclusion', {
      email: normalized,
      error: error.message,
    })
    return false
  }

  return !!data
}
