import { createBrowserClient } from '@supabase/ssr'
import { env, refreshEnvFromWindow } from '../env'
import type { SupabaseClient } from '@supabase/supabase-js'

export function createClient(): SupabaseClient {
  // Get environment variables from centralized config
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Debug logging
  console.log('🔍 Supabase client initialization:', {
    supabaseUrl: supabaseUrl ? '✅ Set' : '❌ Missing',
    supabaseAnonKey: supabaseAnonKey ? '✅ Set' : '❌ Missing',
    processEnv: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing',
    },
    env: {
      NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing',
    }
  })

  // Check if environment variables are available
  if (!supabaseUrl || !supabaseAnonKey) {
    // During build time, return a mock client to prevent build failures
    if (typeof window === 'undefined') {
      console.warn('⚠️ Supabase environment variables not available during build time')
      throw new Error('Supabase environment variables are not configured')
    }
    
    // For client-side, try to load environment variables from API
    console.warn('⚠️ Supabase environment variables not available, trying to load from API...')
    
    // Check if we have cached environment variables in window
    if ((window as any).__ENV__) {
      const windowEnv = (window as any).__ENV__
      if (windowEnv.NEXT_PUBLIC_SUPABASE_URL && windowEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        console.log('🔄 Using cached environment variables from window')
        return createBrowserClient(
          windowEnv.NEXT_PUBLIC_SUPABASE_URL,
          windowEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          {
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
          }
        )
      }
    }
    
    // If no cached variables, throw error with helpful message
    console.error('❌ Missing Supabase environment variables:', {
      supabaseUrl: supabaseUrl ? 'Present' : 'Missing',
      supabaseAnonKey: supabaseAnonKey ? 'Present' : 'Missing',
      windowEnv: (window as any).__ENV__ ? 'Present' : 'Missing'
    })
    
    throw new Error('Supabase environment variables are not configured. Please refresh the page.')
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
