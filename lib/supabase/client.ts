import { createBrowserClient } from '@supabase/ssr'
import { env, refreshEnvFromWindow } from '../env'

export function createClient() {
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
      return null
    }
    
    // For client-side, try to load environment variables from API
    console.warn('⚠️ Supabase environment variables not available, trying to load from API...')
    
    // Return a promise that will resolve when environment variables are loaded
    return new Promise((resolve, reject) => {
      // Try to load environment variables from API
      fetch('/api/env')
        .then(response => response.json())
        .then(envData => {
          if (envData.NEXT_PUBLIC_SUPABASE_URL && envData.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
            // Inject environment variables into global scope
            if (typeof window !== 'undefined') {
              (window as any).__ENV__ = envData
              // Refresh the env object
              refreshEnvFromWindow()
            }
            
            // Create client with loaded variables
            const client = createBrowserClient(envData.NEXT_PUBLIC_SUPABASE_URL, envData.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
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
            
            console.log('✅ Supabase browser client created successfully with API-loaded variables')
            resolve(client)
          } else {
            reject(new Error('Supabase environment variables are not configured'))
          }
        })
        .catch(error => {
          console.error('❌ Failed to load environment variables from API:', error)
          reject(new Error('Supabase environment variables are not configured'))
        })
    })
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
