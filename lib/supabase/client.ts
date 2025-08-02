import { createBrowserClient } from '@supabase/ssr'

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
  // Use the correct environment variables for browser
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Debug logging
  console.log('🔍 Supabase Client Debug:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseKey,
    url: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'missing',
    key: supabaseKey ? `${supabaseKey.substring(0, 20)}...` : 'missing'
  })

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables for client')
    console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl)
    console.error('   NEXT_PUBLIC_SUPABASE_ANON_KEY:', !!supabaseKey)
    
    // In development, throw an error to make it obvious
    if (process.env.NODE_ENV === 'development') {
      throw new Error('Supabase environment variables not configured. Check .env.local file.')
    }
    
    return createDummyClient()
  }

  console.log('✅ Creating Supabase client with valid configuration')
  return createBrowserClient(supabaseUrl, supabaseKey)
}
