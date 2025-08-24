import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from './supabase/client'
import { User, Session } from '@supabase/supabase-js'
import { env, refreshEnvFromWindow } from './env'

interface AuthContextType {
  user: User | null
  session: Session | null
  // eslint-disable-next-line no-unused-vars
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  loading: boolean
  error: string | null
}

// Create default context value
const defaultAuthContext: AuthContextType = {
  user: null,
  session: null,
  login: async () => false,
  logout: () => {},
  loading: true,
  error: null
}

const AuthContext = createContext<AuthContextType>(defaultAuthContext)

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)
  
  // Create Supabase client with error handling
  const [supabase, setSupabase] = useState<any>(null)

  // ✅ Factor VI: Detectar si estamos en el cliente
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Wait for environment variables to be loaded
  useEffect(() => {
    if (!isClient) return

    const waitForEnv = async () => {
      let attempts = 0
      const maxAttempts = 20 // Increased attempts
      
      console.log('🔄 Waiting for environment variables to load...')
      
      while (attempts < maxAttempts) {
        // Try to refresh environment variables
        if (refreshEnvFromWindow()) {
          console.log('✅ Environment variables loaded, proceeding with Supabase initialization')
          break
        }
        
        // Wait a bit before trying again
        await new Promise(resolve => setTimeout(resolve, 1000)) // Increased wait time
        attempts++
        
        console.log(`⏳ Attempt ${attempts}/${maxAttempts} - Waiting for environment variables...`)
        
        if (attempts >= maxAttempts) {
          console.error('❌ Failed to load environment variables after multiple attempts')
          setError('Failed to initialize authentication - environment not ready')
          setLoading(false)
          return
        }
      }
      
      // Now initialize Supabase client
      try {
        console.log('🔧 Initializing Supabase client...')
        const client = createClient()
        if (client) {
          setSupabase(client)
          console.log('✅ Supabase client initialized successfully')
        } else {
          console.error('❌ Failed to create Supabase client - client is null')
          setError('Failed to initialize authentication')
          setLoading(false)
        }
      } catch (err) {
        console.error('❌ Failed to create Supabase client:', err)
        setError('Failed to initialize authentication')
        setLoading(false)
      }
    }

    waitForEnv()
  }, [isClient])

  useEffect(() => {
    // ✅ Solo ejecutar auth checks en el cliente (Factor VI)
    if (!isClient) return

    // If Supabase client failed to initialize, don't proceed
    if (!supabase) {
      console.log('⏳ Waiting for Supabase client to initialize...')
      return
    }

    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log('🔍 Getting initial session...')
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('❌ Error getting initial session:', error)
          setError('Failed to get session')
        } else {
          console.log('✅ Initial session retrieved:', session ? 'Active' : 'None')
          setSession(session)
          setUser(session?.user ?? null)
          setError(null)
        }
      } catch (error) {
        console.error('❌ Error getting initial session:', error)
        setError('Failed to get session')
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string, session: Session | null) => {
        console.log('🔄 Auth state changed:', event, session?.user?.email)
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
        setError(null)

        // ✅ Solo redirigir si estamos en el cliente y tenemos window
        if (isClient && typeof window !== 'undefined') {
          if (event === 'SIGNED_IN' && window.location.pathname === '/app/login') {
            window.location.href = '/dashboard' // ✅ Compatible con Edge Runtime
          } else if (event === 'SIGNED_OUT' && window.location.pathname !== '/app/login' && window.location.pathname !== '/') {
            window.location.href = '/app/login' // ✅ Compatible con Edge Runtime
          }
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [isClient, supabase]) // ✅ Dependencia en isClient y supabase

  const login = async (email: string, password: string): Promise<boolean> => {
    if (!supabase) {
      setError('Authentication not initialized')
      return false
    }

    try {
      setLoading(true)
      setError(null)
      console.log('🔐 Attempting login with:', email)

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        console.error('❌ Login error:', error)
        setError(error.message || 'Login failed')
        return false
      }

      if (data.user) {
        console.log('✅ Login successful:', data.user.email)
        setError(null)
        return true
      }

      setError('Login failed')
      return false
    } catch (error) {
      console.error('❌ Login failed:', error)
      setError('Login failed')
      return false
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    if (!supabase) return

    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('❌ Logout error:', error)
        setError('Logout failed')
      }
    } catch (error) {
      console.error('❌ Logout failed:', error)
      setError('Logout failed')
    }
  }

  // ✅ Durante prerendering (Factor VI - stateless), devolver estado inicial
  if (!isClient) {
    return (
      <AuthContext.Provider value={{ 
        user: null, 
        session: null, 
        login: async () => false, 
        logout: () => {}, 
        loading: true,
        error: null
      }}>
        {children}
      </AuthContext.Provider>
    )
  }

  return (
    <AuthContext.Provider value={{ user, session, login, logout, loading, error }}>
      {children}
    </AuthContext.Provider>
  )
}
