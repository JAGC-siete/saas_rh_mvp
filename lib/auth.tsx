import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { createClient } from './supabase/client'
import { User, Session } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  session: Session | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  login: async () => false,
  logout: () => {},
  loading: true
})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [isClient, setIsClient] = useState(false) // ✅ Factor VI: Stateless durante build
  const router = useRouter()
  const supabase = createClient()

  // ✅ Factor VI: Detectar si estamos en el cliente
  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    // ✅ Solo ejecutar auth checks en el cliente (Factor VI)
    if (!isClient) return

    // Get initial session from localStorage
    const getInitialSession = () => {
      try {
        if (typeof window !== 'undefined') {
          const token = localStorage.getItem('authToken')
          const userStr = localStorage.getItem('user')
          
          if (token && userStr) {
            const user = JSON.parse(userStr)
            setUser(user)
            setSession({ access_token: token, user } as any)
            console.log('Loaded user from localStorage:', user.email)
          }
        }
      } catch (error) {
        console.error('Error loading session from localStorage:', error)
        // Clear invalid data
        localStorage.removeItem('authToken')
        localStorage.removeItem('user')
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()
  }, [isClient]) // ✅ Dependencia en isClient

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true)
      console.log('Attempting login with:', email)

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Login error:', errorData.error)
        return false
      }

      const data = await response.json()
      console.log('Login successful:', data.user.email)
      
      // Store token in localStorage
      localStorage.setItem('authToken', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      
      // Update state
      setUser(data.user)
      
      return true
    } catch (error) {
      console.error('Login failed:', error)
      return false
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      // Clear localStorage
      localStorage.removeItem('authToken')
      localStorage.removeItem('user')
      
      // Clear state
      setUser(null)
      setSession(null)
      
      console.log('Logout successful')
    } catch (error) {
      console.error('Logout failed:', error)
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
        loading: true 
      }}>
        {children}
      </AuthContext.Provider>
    )
  }

  return (
    <AuthContext.Provider value={{ user, session, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}
