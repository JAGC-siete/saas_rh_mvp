import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from './supabase/client'
import { User, Session } from '@supabase/supabase-js'
import { env, refreshEnvFromWindow } from './env'

interface UserProfile {
  id: string
  email: string
  name: string
  role: string
  company_id: string | null
  employee_id?: string
  permissions?: Record<string, any>
}

interface AuthContextType {
  user: User | null
  userProfile: UserProfile | null
  session: Session | null
  // eslint-disable-next-line no-unused-vars
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  loading: boolean
  error: string | null
  refreshUserProfile: () => Promise<void>
}

// Create default context value
const defaultAuthContext: AuthContextType = {
  user: null,
  userProfile: null,
  session: null,
  login: async () => false,
  logout: () => {},
  loading: true,
  error: null,
  refreshUserProfile: async () => {}
}

const AuthContext = createContext<AuthContextType>(defaultAuthContext)

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)
  
  // Create Supabase client with error handling
  const [supabase, setSupabase] = useState<any>(null)


  // Function to refresh user profile
  const refreshUserProfile = async () => {
    if (!supabase || !user) return

    try {
      const response = await fetch('/api/user-profiles', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        // Find the current user's profile
        const profile = data.profiles?.find((p: any) => p.id === user.id)
        if (profile) {
          setUserProfile(profile)
        }
      }
    } catch (error) {
      console.error('Error refreshing user profile:', error)
    }
  }

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
        const client = await createClient()
        setSupabase(client)
        console.log('✅ Supabase client initialized successfully')
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
          
          // User profile will be loaded from login response data
        }
        
        // Si no hay sesión de Supabase, verificar si hay datos de usuario en localStorage
        if (!session && typeof window !== 'undefined') {
          const userData = localStorage.getItem('user')
          
          if (userData) {
            try {
              const user = JSON.parse(userData)
              console.log('🔑 Found user data in localStorage:', user.email)
              setUser(user)
              
              // Create a proper user profile object from localStorage data
              const userProfile = {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                company_id: user.company_id,
                is_active: true,
                permissions: {},
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }
              
              setUserProfile(userProfile)
              console.log('✅ User profile set from localStorage:', userProfile)
            } catch (err) {
              console.error('❌ Error parsing user data from localStorage:', err)
              localStorage.removeItem('user')
            }
          }
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

        // User profile will be loaded from login response data

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
    try {
      setLoading(true)
      setError(null)
      console.log('🔐 Attempting login with:', email)

      const response = await fetch('/api/auth/login-supabase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      if (!response.ok) {
        const errorData = await response.json()
        setError(errorData.error || 'Login failed')
        return false
      }

      const data = await response.json()
      
      // Store user data in localStorage (no custom JWT needed)
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(data.user))
      }

      // Create a proper user profile object from login response
      const userProfile = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        role: data.user.role,
        company_id: data.user.company_id,
        is_active: true,
        permissions: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      // Set user profile from login response
      setUserProfile(userProfile)
      setUser(data.user)
      setSession(data.session) // Use Supabase session directly

      console.log('✅ Login successful:', data.user.email)
      setError(null)
      return true

    } catch (error) {
      console.error('❌ Login failed:', error)
      setError('Login failed')
      return false
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      // Limpiar localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('user')
      }
      
      // Limpiar estado local
      setUser(null)
      setUserProfile(null)
      setSession(null)
      setError(null)
      
      // Si hay cliente de Supabase, hacer signOut
      if (supabase) {
        const { error } = await supabase.auth.signOut()
        if (error) {
          console.error('❌ Logout error:', error)
          setError('Logout failed')
        }
      }
      
      console.log('✅ Logout successful')
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
        userProfile: null,
        session: null, 
        login: async () => false, 
        logout: () => {}, 
        loading: true,
        error: null,
        refreshUserProfile: async () => {}
      }}>
        {children}
      </AuthContext.Provider>
    )
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      userProfile, 
      session, 
      login, 
      logout, 
      loading, 
      error, 
      refreshUserProfile 
    }}>
      {children}
    </AuthContext.Provider>
  )
}
