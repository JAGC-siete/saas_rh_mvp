import React, { createContext } from 'react'
import { AppProps } from 'next/app'
import Head from 'next/head'
import { AuthProvider } from '../lib/auth'
import { NotificationProvider } from '../components/NotificationProvider'
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
  const [isClient, setIsClient] = React.useState(false)

  React.useEffect(() => {
    setIsClient(true)
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
    <SupabaseContext.Provider value={null}>
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
