import { createBrowserClient } from '@supabase/ssr'
import { validateSupabaseConfig, supabaseConfig } from '../supabase-config'

export function createClient() {
  // Validate environment variables
  validateSupabaseConfig()

  return createBrowserClient(supabaseConfig.url!, supabaseConfig.anonKey!)
}
