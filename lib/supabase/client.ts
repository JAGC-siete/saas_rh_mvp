import { createBrowserClient } from '@supabase/ssr'
import { validateEnvironmentVariables, env } from '../env-validation'

export function createClient() {
  // Validate environment variables
  validateEnvironmentVariables()

  return createBrowserClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}
