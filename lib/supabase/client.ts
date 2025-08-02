import { createBrowserClient } from '@supabase/ssr'

// Hardcoded values for development (temporary fix)
const SUPABASE_URL = 'https://fwyxmovfrzauebiqxchz.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3eXhtb3ZmcnphdWViaXF4Y2h6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxODk5MjEsImV4cCI6MjA2Nzc2NTkyMX0.pXArDqHGA4yjprTqJfsNQXwzS-WLz6NCK5QRbLAyYmA'

export function createClient() {
  // Try environment variables first
  let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  let supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Fallback to hardcoded values if environment variables are not available
  if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️ Environment variables not found, using fallback values')
    supabaseUrl = SUPABASE_URL
    supabaseKey = SUPABASE_ANON_KEY
  }

  console.log('🔍 Supabase Client Debug:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseKey,
    source: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'env' : 'fallback'
  })

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase configuration is missing')
  }

  console.log('✅ Creating Supabase client with valid configuration')
  return createBrowserClient(supabaseUrl, supabaseKey)
}
