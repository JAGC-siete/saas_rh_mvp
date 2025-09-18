import { createBrowserClient } from '@supabase/ssr'
import { env, refreshEnvFromWindow } from '../env'
import type { SupabaseClient } from '@supabase/supabase-js'

export function createClient(): SupabaseClient {
  // Try to get environment variables directly from process.env first
  let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  let supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // If not available, try from centralized config
  if (!supabaseUrl || !supabaseAnonKey) {
    supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
    supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  }

  // Debug logging
  console.log('🔍 Supabase client initialization:', {
    supabaseUrl: supabaseUrl ? '✅ Set' : '❌ Missing',
    supabaseAnonKey: supabaseAnonKey ? '✅ Set' : '❌ Missing',
    processEnv: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing',
    }
  })

  // Check if environment variables are available
  if (!supabaseUrl || !supabaseAnonKey) {
    const errorMessage = `❌ CRITICAL: Supabase environment variables not configured
    
    Required variables:
    - NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? '✅ Set' : '❌ Missing'}
    - NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseAnonKey ? '✅ Set' : '❌ Missing'}
    
    Please ensure these are set in:
    1. .env file (for development)
    2. Railway/Vercel dashboard (for production)
    3. Docker environment (for containers)
    
    Current environment: ${process.env.NODE_ENV || 'unknown'}
    `
    
    console.error(errorMessage)
    
    if (typeof window === 'undefined') {
      // Server-side: Fail fast during build
      throw new Error('Supabase environment variables must be configured before build')
    } else {
      // Client-side: Show user-friendly error
      throw new Error('Application configuration error. Please contact system administrator.')
    }
  }

  // Ensure we have valid strings before creating client
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase URL and Anon Key are required')
  }

  try {
    const client = createBrowserClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      },
      global: {
        headers: {
          'X-Client-Info': 'hr-saas-frontend'
        }
      }
    })
    
    console.log('✅ Supabase browser client created successfully')
    return client
  } catch (error) {
    console.error('❌ Failed to create Supabase browser client:', error)
    throw error
  }
}

// Async version for backward compatibility
export async function createClientAsync(): Promise<SupabaseClient> {
  return createClient()
}
