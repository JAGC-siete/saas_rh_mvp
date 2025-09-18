import { AppProps } from 'next/app'
import { createClient } from '../lib/supabase/client'
import { createContext, useState, useEffect } from 'react'
import { AuthProvider } from '../lib/auth'
import { NotificationProvider } from '../components/NotificationProvider'
import { refreshEnvFromWindow } from '../lib/env'
import '../styles/globals.css'
import '../styles/landing.css'

// Load environment variables at the top level
if (typeof window === 'undefined') {
  // Server-side: load environment variables
  require('dotenv').config()
}

// Create a context for Supabase client (using new SSR client)
export const SupabaseContext = createContext<any>(null)

// Function to load environment variables from API
async function loadEnvironmentVariables() {
  try {
    const response = await fetch('/api/env')
    if (response.ok) {
      const envData = await response.json()
      
      // Inject environment variables into global scope for client-side access
      if (typeof window !== 'undefined') {
        (window as any).__ENV__ = envData
        
        // Refresh the env object with the loaded variables
        refreshEnvFromWindow()
      }
      
      return envData
    }
  } catch (error) {
    console.error('❌ Failed to load environment variables from API:', error)
  }
  return null
}

export default function App({ Component, pageProps }: AppProps) {
  const [supabaseClient, setSupabaseClient] = useState<any>(null)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    
    // Initialize Supabase client
    const initClient = async () => {
      try {
        const client = await createClient()
        if (client) {
          setSupabaseClient(client)
        }
      } catch (error) {
        console.error('❌ Failed to create Supabase client:', error)
      }
    }
    
    initClient()
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
            <Component {...pageProps} />
          </div>
        </NotificationProvider>
      </AuthProvider>
    </SupabaseContext.Provider>
  )
}
