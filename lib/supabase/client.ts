import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../supabase'
import { getClientEnvSync, areClientEnvVarsAvailable } from '../env-client'

// Singleton instance for browser client
let browserClient: SupabaseClient<Database> | null = null

/**
 * Creates a Supabase client for browser usage only.
 * This should NEVER be used in server-side code or middleware.
 * 
 * @returns SupabaseClient<Database> - Typed Supabase client
 */
export function createClient(): SupabaseClient<Database> {
  // Return singleton if already created
  if (browserClient) {
    return browserClient
  }

  // Validate we're in browser environment
  if (typeof window === 'undefined') {
    throw new Error('createClient() should only be called in browser environment. Use createServerClient() for server-side code.')
  }

  // Get environment variables using our client-side loader
  const clientEnv = getClientEnvSync()
  let supabaseUrl = clientEnv.NEXT_PUBLIC_SUPABASE_URL
  let supabaseAnonKey = clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  // Fallback to process.env if client env is not loaded yet
  if (!supabaseUrl || !supabaseAnonKey) {
    supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  }
  
  // Final fallback to window.__ENV__ if available
  if ((!supabaseUrl || !supabaseAnonKey) && (window as any).__ENV__) {
    supabaseUrl = (window as any).__ENV__.NEXT_PUBLIC_SUPABASE_URL || supabaseUrl
    supabaseAnonKey = (window as any).__ENV__.NEXT_PUBLIC_SUPABASE_ANON_KEY || supabaseAnonKey
  }

  // Debug logging (always show in development, show errors in production)
  const isDev = process.env.NODE_ENV === 'development'
  if (isDev || (!supabaseUrl || !supabaseAnonKey)) {
    console.log('🔍 Supabase browser client initialization:', {
      supabaseUrl: supabaseUrl ? '✅ Set' : '❌ Missing',
      supabaseAnonKey: supabaseAnonKey ? '✅ Set' : '❌ Missing',
      clientEnvLoaded: areClientEnvVarsAvailable(),
      hasWindowEnv: !!(window as any).__ENV__,
      processEnvUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing',
      processEnvKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing',
    })
  }

  // Validate required environment variables
  if (!supabaseUrl || !supabaseAnonKey) {
    const errorMessage = `Supabase environment variables not configured:
    - NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? 'Set' : 'Missing'}
    - NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseAnonKey ? 'Set' : 'Missing'}
    - Client env loaded: ${areClientEnvVarsAvailable() ? 'Yes' : 'No'}
    
    Please ensure these are set in your deployment environment.`
    
    console.error(errorMessage)
    throw new Error('Application configuration error. Please contact system administrator.')
  }

  try {
    // Create browser client with proper configuration
    browserClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false // Only enable in callback routes
      },
      global: {
        headers: {
          'X-Client-Info': 'hr-saas-frontend'
        }
      }
    })
    
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Supabase browser client created successfully')
    }
    
    return browserClient
  } catch (error) {
    console.error('❌ Failed to create Supabase browser client:', error)
    throw error
  }
}

/**
 * Creates a Supabase client for callback routes only.
 * This enables detectSessionInUrl for OAuth callbacks.
 * 
 * @returns SupabaseClient<Database> - Typed Supabase client for callbacks
 */
export function createCallbackClient(): SupabaseClient<Database> {
  // Validate we're in browser environment
  if (typeof window === 'undefined') {
    throw new Error('createCallbackClient() should only be called in browser environment.')
  }

  let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  let supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  // Fallback to window.__ENV__ if process.env is not available
  if ((!supabaseUrl || !supabaseAnonKey) && (window as any).__ENV__) {
    supabaseUrl = (window as any).__ENV__.NEXT_PUBLIC_SUPABASE_URL || supabaseUrl
    supabaseAnonKey = (window as any).__ENV__.NEXT_PUBLIC_SUPABASE_ANON_KEY || supabaseAnonKey
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase environment variables not configured')
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true // Enable for callback routes
    },
    global: {
      headers: {
        'X-Client-Info': 'hr-saas-frontend-callback'
      }
    }
  })
}

// Async version for backward compatibility
export async function createClientAsync(): Promise<SupabaseClient<Database>> {
  return createClient()
}
