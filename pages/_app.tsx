import { AppProps } from 'next/app'
import { createClient } from '../lib/supabase/client'
import { createContext, useState, useEffect } from 'react'
import { AuthProvider } from '../lib/auth'
import '../styles/globals.css'
import '../styles/landing.css'

// Create a context for Supabase client (using new SSR client)
export const SupabaseContext = createContext<any>(null)

export default function App({ Component, pageProps }: AppProps) {
  const [supabaseClient, setSupabaseClient] = useState<any>(null)

  useEffect(() => {
    // Initialize Supabase client only on client side
    try {
      const client = createClient()
      if (client) {
        setSupabaseClient(client)
      }
    } catch (error) {
      console.error('Failed to create Supabase client:', error)
    }
  }, [])

  return (
    <SupabaseContext.Provider value={supabaseClient}>
      <AuthProvider>
        <div className="min-h-screen bg-app">
          <Component {...pageProps} />
        </div>
      </AuthProvider>
    </SupabaseContext.Provider>
  )
}
