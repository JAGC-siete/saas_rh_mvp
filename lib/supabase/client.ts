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
    // During build time, use hardcoded values for development
    if (typeof window === 'undefined') {
      console.warn('⚠️ Supabase environment variables not available during build time, using fallback')
      supabaseUrl = 'https://fwyxmovfrzauebiqxchz.supabase.co'
      supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3eXhtb3ZmcnphdWViaXF4Y2h6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxODk5MjEsImV4cCI6MjA2Nzc2NTkyMX0.K5XwWr0RPK7mq2L2z0TZfA_u6ZreOF7Qfj0cYYKkQzI'
    } else {
      // For client-side, check if we have cached environment variables in window
      if ((window as any).__ENV__) {
        const windowEnv = (window as any).__ENV__
        if (windowEnv.NEXT_PUBLIC_SUPABASE_URL && windowEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
          console.log('🔄 Using cached environment variables from window')
          supabaseUrl = windowEnv.NEXT_PUBLIC_SUPABASE_URL
          supabaseAnonKey = windowEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY
        } else {
          // Use hardcoded values as fallback
          console.warn('⚠️ Using hardcoded Supabase values as fallback')
          supabaseUrl = 'https://fwyxmovfrzauebiqxchz.supabase.co'
          supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3eXhtb3ZmcnphdWViaXF4Y2h6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxODk5MjEsImV4cCI6MjA2Nzc2NTkyMX0.K5XwWr0RPK7mq2L2z0TZfA_u6ZreOF7Qfj0cYYKkQzI'
        }
      } else {
        // Use hardcoded values as final fallback
        console.warn('⚠️ No environment variables found, using hardcoded values')
        supabaseUrl = 'https://fwyxmovfrzauebiqxchz.supabase.co'
        supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3eXhtb3ZmcnphdWViaXF4Y2h6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxODk5MjEsImV4cCI6MjA2Nzc2NTkyMX0.K5XwWr0RPK7mq2L2z0TZfA_u6ZreOF7Qfj0cYYKkQzI'
      }
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
