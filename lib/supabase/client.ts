import { createBrowserClient } from '@supabase/ssr'
import { logger } from '../logger'

// Create a dummy client for build time
const createDummyClient = () => ({
  auth: {
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signOut: () => Promise.resolve({ error: null }),
    signInWithPassword: () => Promise.resolve({ data: { user: null, session: null }, error: { message: 'Supabase not configured' } }),
    signUp: () => Promise.resolve({ data: { user: null, session: null }, error: { message: 'Supabase not configured' } }),
    resetPasswordForEmail: () => Promise.resolve({ error: null }),
    updateUser: () => Promise.resolve({ data: { user: null }, error: null }),
    getUser: () => Promise.resolve({ data: { user: null }, error: null })
  },
  from: () => ({
    select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
    insert: () => Promise.resolve({ data: null, error: null }),
    update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
    delete: () => ({ eq: () => Promise.resolve({ data: null, error: null }) })
  })
})

export function createClient() {
  // Use environment variables for browser client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    logger.error('Missing Supabase environment variables for browser client', undefined, {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey
    })
    
    // In development: throw error to catch configuration issues early
    if (process.env.NODE_ENV === 'development') {
      throw new Error('Supabase configuration not found')
    }
    
    // In production: return dummy client to prevent app crash
    return createDummyClient()
  }

  return createBrowserClient(supabaseUrl, supabaseKey)
}
