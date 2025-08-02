import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from './supabase/client'
import { User, Session } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  session: Session | null
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  loading: boolean
  isClient: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  login: async () => ({ success: false }),
  logout: async () => {},
  loading: true,
  isClient: false
})

export const useAuth = () => useContext(AuthContext)

/**
 * 12-Factor App Compliant AuthProvider
 * 
 * Factor VI (Stateless): No server-side state, uses Supabase sessions
 * Factor III (Config): Environment variables for Supabase config
 * Factor VIII (Concurrency): Stateless, can handle multiple instances
 * Factor X (Dev/Prod Parity): Same code, different environment configs
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [isClient, setIsClient] = useState(false)
  const supabase = createClient()

  // Factor VI: Stateless during SSR/build
  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!isClient) return

    // Get initial session from Supabase (Factor VI: Stateless)
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) {
          console.error('Error getting initial session:', error)
          return
        }
        
        setSession(session)
        setUser(session?.user ?? null)
      } catch (error) {
        console.error('Error in getInitialSession:', error)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth state changes (Supabase handles session management)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email)
        
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)

        // Factor VI: Client-side redirects only
        if (isClient && typeof window !== 'undefined') {
          if (event === 'SIGNED_IN' && window.location.pathname === '/login') {
            window.location.href = '/dashboard'
          } else if (event === 'SIGNED_OUT' && 
                     window.location.pathname !== '/login' && 
                     window.location.pathname !== '/') {
            window.location.href = '/login'
          }
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [isClient, supabase.auth])

  /**
   * Login using Supabase Auth directly (12-Factor compliant)
   * Factor III: Uses environment variables for Supabase config
   * Factor VI: Stateless, no server-side session storage
   */
  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true)
      console.log('Attempting login with Supabase Auth:', email)

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        console.error('Supabase login error:', error)
        return { success: false, error: error.message }
      }

      if (data.user) {
        console.log('Supabase login successful:', data.user.email)
        return { success: true }
      }

      return { success: false, error: 'No user data returned' }
    } catch (error) {
      console.error('Login failed:', error)
      return { success: false, error: 'Login failed' }
    } finally {
      setLoading(false)
    }
  }

  /**
   * Logout using Supabase Auth (12-Factor compliant)
   * Factor VI: Stateless, Supabase handles session cleanup
   */
  const logout = async (): Promise<void> => {
    try {
      setLoading(true)
      console.log('Logging out with Supabase Auth')

      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('Logout error:', error)
      } else {
        console.log('Logout successful')
        setUser(null)
        setSession(null)
      }
    } catch (error) {
      console.error('Logout failed:', error)
    } finally {
      setLoading(false)
    }
  }

  // Factor VI: Return initial state during SSR/build
  if (!isClient) {
    return (
      <AuthContext.Provider value={{ 
        user: null, 
        session: null, 
        login: async () => ({ success: false }), 
        logout: async () => {}, 
        loading: true,
        isClient: false
      }}>
        {children}
      </AuthContext.Provider>
    )
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      login, 
      logout, 
      loading,
      isClient 
    }}>
      {children}
    </AuthContext.Provider>
  )
} 