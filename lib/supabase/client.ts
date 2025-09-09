import { createBrowserClient } from '@supabase/ssr'
import { env } from '../env'

export function createClient() {
  // Get environment variables directly from process.env for client-side
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Debug logging
  console.log('🔍 Supabase client initialization:', {
    supabaseUrl: supabaseUrl ? '✅ Set' : '❌ Missing',
    supabaseAnonKey: supabaseAnonKey ? '✅ Set' : '❌ Missing',
    processEnv: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing',
    },
    env: env
  })

  // Check if environment variables are available
  if (!supabaseUrl || !supabaseAnonKey) {
    // During build time, return a mock client to prevent build failures
    if (typeof window === 'undefined') {
      console.warn('⚠️ Supabase environment variables not available during build time')
      return null
    }
    
    console.error('❌ Missing Supabase environment variables on client side')
    console.error('SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing')
    console.error('SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ Set' : '❌ Missing')
    console.error('Environment check:', env)
    console.error('Process.env check:', {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing',
    })
    throw new Error('Supabase environment variables are not configured')
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
