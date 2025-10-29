import { AppProps } from 'next/app'
import Head from 'next/head'
import { createClient } from '../lib/supabase/client'
import { createContext, useState, useEffect } from 'react'
import { AuthProvider } from '../lib/auth'
import { NotificationProvider } from '../components/NotificationProvider'
import { areEnvVarsAvailable } from '../lib/env'
import { SessionExpiryWarning } from '../components/SessionExpiryWarning'
import '../styles/globals.css'
import '../styles/landing.css'

// Load environment variables at the top level
if (typeof window === 'undefined') {
  // Server-side: load environment variables
  require('dotenv').config()
}

// Create a context for Supabase client (using new SSR client)
export const SupabaseContext = createContext<any>(null)

// Simplified environment variable check
function checkEnvironmentVariables() {
  if (typeof window !== 'undefined') {
    console.log('🔍 Client-side environment check:', {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing',
    })
  }
}

export default function App({ Component, pageProps }: AppProps) {
  const [supabaseClient, setSupabaseClient] = useState<any>(null)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    
    // Initialize Supabase client
    try {
      const client = createClient()
      if (client) {
        setSupabaseClient(client)
        console.log('✅ Supabase client initialized successfully')
      }
    } catch (error) {
      console.error('❌ Failed to create Supabase client:', error)
      // Still set a mock client to prevent app from breaking
      setSupabaseClient({})
    }
  }, [])

  // Show loading state during hydration
  if (!isClient) {
    return (
      <div className="min-h-screen bg-app flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    )
  }

  return (
    <SupabaseContext.Provider value={supabaseClient}>
      <AuthProvider>
        <NotificationProvider>
          <div className="min-h-screen bg-app">
            <Head>
              <title>Servicio Hondureño de Recursos Humanos | Digital & Automatizado</title>
              <meta name="title" content="Servicio Hondureño de Recursos Humanos | Digital & Automatizado" />
              <meta name="twitter:title" content="Servicio Hondureño de Recursos Humanos | Digital & Automatizado" />
              <meta property="og:title" content="Servicio Hondureño de Recursos Humanos | Digital & Automatizado" />
            </Head>
            <Component {...pageProps} />
            {/* Idle Timeout Warning - Shows at 80 minutes of inactivity */}
            <SessionExpiryWarning 
              onExpiry={() => {
                // Redirect to login on session expiry
                if (typeof window !== 'undefined') {
                  window.location.href = '/app/login'
                }
              }} 
            />
          </div>
        </NotificationProvider>
      </AuthProvider>
    </SupabaseContext.Provider>
  )
}
