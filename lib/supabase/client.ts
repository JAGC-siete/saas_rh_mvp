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
  // Check for environment variables in browser
  const url = typeof window !== 'undefined' ? window.__NEXT_DATA__?.props?.supabaseUrl : process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = typeof window !== 'undefined' ? window.__NEXT_DATA__?.props?.supabaseKey : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Fallback to direct env vars
  const supabaseUrl = url || 'https://fwyxmovfrzauebiqxchz.supabase.co'
  const supabaseKey = key || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3eXhtb3ZmcnphdWViaXF4Y2h6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxODk5MjEsImV4cCI6MjA2Nzc2NTkyMX0.pXArDqHGA4yjprTqJfsNQXwzS-WLz6NCK5QRbLAyYmA'

  return createBrowserClient(supabaseUrl, supabaseKey)
}
