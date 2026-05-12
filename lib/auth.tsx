import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { createClient } from './supabase/client'
import { User, Session } from '@supabase/supabase-js'
import { env, areEnvVarsAvailable } from './env'
import { initializeClientEnv } from './env-client'

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
  /** Pass `user` + `accessToken` after `setSession`/`setUser` so refresh is not skipped by stale React state (e.g. cold load with existing session). */
  refreshUserProfile: (opts?: { user: User; accessToken: string }) => Promise<void>
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
  const [envInitialized, setEnvInitialized] = useState(false)
  
  // Create Supabase client with error handling
  const [supabase, setSupabase] = useState<any>(null)

  const userRef = useRef<User | null>(null)
  const sessionRef = useRef<Session | null>(null)
  userRef.current = user
  sessionRef.current = session

  const refreshUserProfile = useCallback(
    async (opts?: { user: User; accessToken: string }) => {
      if (!supabase) return
      const authUser = opts?.user ?? userRef.current
      const accessToken = opts?.accessToken ?? sessionRef.current?.access_token
      if (!authUser?.id || !accessToken) return

      try {
        const response = await fetch('/api/user-profiles', {
          credentials: 'include',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          const profile = data.profiles?.find((p: any) => p.id === authUser.id)
          if (profile) {
            setUserProfile(profile)

            if (typeof window !== 'undefined') {
              try {
                const raw = localStorage.getItem('user')
                const existing = raw ? JSON.parse(raw) : {}
                const merged = {
                  ...existing,
                  id: profile.id ?? existing.id,
                  email: profile.email ?? existing.email,
                  role: profile.role ?? existing.role,
                  company_id: profile.company_id ?? existing.company_id ?? null,
                  permissions:
                    profile.permissions && typeof profile.permissions === 'object'
                      ? profile.permissions
                      : existing.permissions || {},
                }
                localStorage.setItem('user', JSON.stringify(merged))
              } catch {
                // ignore localStorage write errors
              }
            }
          }
        }
      } catch (error) {
        console.error('Error refreshing user profile:', error)
      }
    },
    [supabase]
  )

  // ✅ Factor VI: Detectar si estamos en el cliente
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Initialize Supabase client with environment variable loading
  useEffect(() => {
    if (!isClient) return

    const initializeSupabase = async () => {
      try {
        console.log('🔧 Initializing Supabase client...')
        
        // First, initialize client environment variables
        console.log('🔍 Loading client environment variables...')
        await initializeClientEnv()
        setEnvInitialized(true)
        console.log('✅ Client environment variables loaded')
        
        // Check if environment variables are available
        if (!areEnvVarsAvailable()) {
          console.error('❌ Supabase environment variables not available after loading')
          setError('Supabase configuration missing')
          setLoading(false)
          return
        }
        
        console.log('✅ Environment variables available, creating Supabase client')
        const client = await createClient()
        setSupabase(client)
        console.log('✅ Supabase client initialized successfully')
      } catch (err) {
        console.error('❌ Failed to create Supabase client:', err)
        setError('Failed to initialize authentication')
        setLoading(false)
      }
    }

    initializeSupabase()
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

          // If we have a Supabase session, always refresh the profile so that
          // permissions reflect the latest server-side state (avoids stale
          // permissions cached in localStorage gating UI like export buttons).
          if (session?.user?.id && session.access_token) {
            await refreshUserProfile({ user: session.user, accessToken: session.access_token })
          }
        }
        
        // Si no hay sesión de Supabase, verificar si hay datos de usuario en localStorage
        if (!session && typeof window !== 'undefined') {
          const userData = localStorage.getItem('user')
          
          if (userData) {
            try {
              const user = JSON.parse(userData)
              console.log('🔑 Found user data in localStorage:', user.email)
              setUser(user)

              const persistedPermissions =
                user && typeof user.permissions === 'object' && user.permissions !== null
                  ? user.permissions
                  : {}

              const userProfile = {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                company_id: user.company_id,
                is_active: true,
                permissions: persistedPermissions,
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
        // Defer loading=false until we at least attempted to populate userProfile
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
        if (
          (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') &&
          session?.user?.id &&
          session.access_token
        ) {
          await refreshUserProfile({ user: session.user, accessToken: session.access_token })
        }
        setLoading(false)
        setError(null)

        // User profile will be loaded from login response data

        // ✅ Solo redirigir si estamos en el cliente y tenemos window
        if (isClient && typeof window !== 'undefined') {
          if (event === 'SIGNED_IN' && window.location.pathname === '/app/login') {
            // Decide redirect using the user object stored on login response.
            // Security is enforced server-side; this is UX only.
            let redirectTo = '/app/dashboard'
            try {
              const raw = localStorage.getItem('user')
              if (raw) {
                const u = JSON.parse(raw)
                const role = String(u?.role || '').trim().toLowerCase()
                const companyId = u?.company_id || null
                if (role === 'super_admin') redirectTo = '/app/admin'
                else if (!companyId) redirectTo = '/onboarding'
              }
            } catch {
              // ignore parse errors; fallback redirect applies
            }

            window.location.href = redirectTo // ✅ Compatible con Edge Runtime
          } else if (event === 'SIGNED_OUT' && window.location.pathname !== '/app/login' && window.location.pathname !== '/') {
            window.location.href = '/app/login' // ✅ Compatible con Edge Runtime
          }
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [isClient, supabase, refreshUserProfile])

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true)
      setError(null)
      const normalizedEmail = (email ?? '').trim().toLowerCase()
      const normalizedPassword = (password ?? '').replace(/[\u0009\u000A\u000D\u00A0\u200B\u200C\u200D\uFEFF]/g, '')
      console.log('🔐 Attempting login with:', normalizedEmail)

      const response = await fetch('/api/auth/login-supabase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, password: normalizedPassword })
      })

      if (!response.ok) {
        const errorData = await response.json()
        setError(errorData.error || 'Login failed')
        return false
      }

      const data = await response.json()

      // Prefer the full profile (with real permissions) returned by the API.
      const apiProfile = data.userProfile || null
      const apiPermissions =
        apiProfile && typeof apiProfile.permissions === 'object' && apiProfile.permissions !== null
          ? apiProfile.permissions
          : {}

      // Store user data in localStorage so we can rehydrate permissions on
      // subsequent reloads without re-fetching.
      if (typeof window !== 'undefined') {
        const persisted = {
          ...data.user,
          permissions: apiPermissions,
        }
        localStorage.setItem('user', JSON.stringify(persisted))
      }

      // Create a proper user profile object from login response.
      // IMPORTANT: use real permissions from the API; never hardcode {}.
      const userProfile = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        role: data.user.role,
        company_id: data.user.company_id,
        is_active: true,
        permissions: apiPermissions,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      setUserProfile(userProfile)
      setUser(data.user)
      setSession(data.session) // Use Supabase session directly

      // Sync Supabase browser client session so useAuth sees it immediately
      try {
        const client = supabase || await createClient()
        if (data?.session?.access_token && data?.session?.refresh_token) {
          await client.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token
          })
        }
      } catch (e) {
        console.warn('Could not set Supabase session in browser client', e)
      }

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
