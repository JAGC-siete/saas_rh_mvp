import { AppProps } from 'next/app'
import { createClient } from '../lib/supabase/client'
import { createContext, useState } from 'react'
import { AuthProvider } from '../lib/auth'
import '../styles/globals.css'

// Create a context for Supabase client (using new SSR client)
export const SupabaseContext = createContext<any>(null)

export default function App({ Component, pageProps }: AppProps) {
  const [supabaseClient] = useState(() => createClient())

  return (
    <SupabaseContext.Provider value={supabaseClient}>
      <AuthProvider>
        <Component {...pageProps} />
      </AuthProvider>
    </SupabaseContext.Provider>
  )
}
