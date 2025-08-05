import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // Get environment variables directly without validation
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Check if environment variables are available
  if (!supabaseUrl || !supabaseAnonKey) {
    // During build time, return a mock client to prevent build failures
    if (typeof window === 'undefined') {
      console.warn('Supabase environment variables not available during build time')
      return null
    }
    
    console.error('Missing Supabase environment variables')
    throw new Error('Supabase environment variables are not configured')
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
