import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // Get environment variables directly without validation
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  // Check if environment variables are available
  if (!supabaseUrl || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error('Missing Supabase environment variables')
    throw new Error('Supabase environment variables are not configured')
  }

  return createBrowserClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}
