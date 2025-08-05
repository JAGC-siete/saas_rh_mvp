import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      `Missing Supabase environment variables:
      NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? 'DEFINIDA' : 'NO_DEFINIDA'}
      NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseKey ? 'DEFINIDA' : 'NO_DEFINIDA'}
      
      Please check your .env.local file and ensure the variables are properly set.`
    )
  }

  console.log('🔍 Supabase Client Debug:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseKey,
    source: 'env'
  })

  console.log('✅ Creating Supabase client with valid configuration')
  return createBrowserClient(supabaseUrl, supabaseKey)
}
