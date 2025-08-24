import { AppProps } from 'next/app'
import { createClient } from '../lib/supabase/client'
import { createContext, useState, useEffect } from 'react'
import { AuthProvider } from '../lib/auth'
import { refreshEnvFromWindow } from '../lib/env'
import '../styles/globals.css'
import '../styles/landing.css'

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
        console.log('✅ Environment variables loaded from API:', envData)
        
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
  const [envLoaded, setEnvLoaded] = useState(false)

  useEffect(() => {
    // Load environment variables first
    const loadEnv = async () => {
      await loadEnvironmentVariables()
      setEnvLoaded(true)
    }
    
    loadEnv()
  }, [])

  useEffect(() => {
    // Initialize Supabase client only after environment variables are loaded
    if (!envLoaded) return
    
    try {
      const client = createClient()
      if (client) {
        setSupabaseClient(client)
        console.log('✅ Supabase client initialized successfully')
      }
    } catch (error) {
      console.error('❌ Failed to create Supabase client:', error)
    }
  }, [envLoaded])

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
