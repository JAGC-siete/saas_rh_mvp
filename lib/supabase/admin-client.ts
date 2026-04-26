/**
 * Admin Supabase client for server-side use (getStaticProps, getServerSideProps, API routes).
 * This module does not import next/headers so it is safe to use from Pages Router.
 */

import { createClient } from '@supabase/supabase-js'
import { env } from '../env'

export function createAdminClient() {
  try {
    const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
    const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl) {
      console.error('❌ Missing Supabase URL environment variable (NEXT_PUBLIC_SUPABASE_URL)')
      return createClient('https://placeholder.supabase.co', 'placeholder-key', {
        auth: { autoRefreshToken: false, persistSession: false }
      })
    }

    const keyToUse = serviceKey || anonKey
    if (!keyToUse) {
      console.error('❌ Missing Supabase keys (SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_ANON_KEY)')
      return createClient(supabaseUrl, 'placeholder-key', {
        auth: { autoRefreshToken: false, persistSession: false }
      })
    }

    if (!serviceKey) {
      console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY is missing. Falling back to anon key for admin client.')
    }

    return createClient(supabaseUrl, keyToUse, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  } catch (error) {
    console.error('Fatal error in createAdminClient:', error)
    return createClient('https://placeholder.supabase.co', 'fatal-error-key', {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  }
}
