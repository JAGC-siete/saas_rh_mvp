/**
 * Admin Supabase client for server-side use (getStaticProps, getServerSideProps, API routes).
 * This module does not import next/headers so it is safe to use from Pages Router.
 */

import { createClient } from '@supabase/supabase-js'
import { env } from '../env'

export function createAdminClient() {
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL for admin client')
  }

  if (!serviceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY for admin client')
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
