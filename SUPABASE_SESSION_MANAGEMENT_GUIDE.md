# 🚀 Supabase Session Management Guide

## 🔍 Current Issues Analysis

### Problem 1: Invalid Credentials in Production
The issue is likely due to:
1. **Environment variables not set in production**
2. **Different Supabase project in production vs local**
3. **Users not created in production Supabase**

### Problem 2: Not Leveraging Supabase's Built-in Session Management
Currently using custom JWT tokens instead of Supabase's native session management.

---

## ✅ Solution: Proper Supabase Session Management

### 1. **Native Supabase Auth (Recommended)**

#### Benefits:
- ✅ **Automatic session management**
- ✅ **Built-in security**
- ✅ **Real-time session updates**
- ✅ **Automatic token refresh**
- ✅ **Row Level Security (RLS) integration**
- ✅ **No custom JWT needed**

#### Implementation:

```typescript
// lib/auth.tsx - Simplified with native Supabase sessions
import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from './supabase/client'
import { User, Session } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  session: Session | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  login: async () => false,
  logout: async () => {},
  loading: true
})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [isClient, setIsClient] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!isClient) return

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setSession(session)
        setUser(session?.user ?? null)
      } catch (error) {
        console.error('Error getting initial session:', error)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email)
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)

        if (isClient && typeof window !== 'undefined') {
          if (event === 'SIGNED_IN' && window.location.pathname === '/login') {
            window.location.href = '/dashboard'
          } else if (event === 'SIGNED_OUT' && window.location.pathname !== '/login' && window.location.pathname !== '/') {
            window.location.href = '/login'
          }
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [isClient])

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true)
      console.log('Attempting login with:', email)

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        console.error('Login error:', error)
        return false
      }

      if (data.user) {
        console.log('Login successful:', data.user.email)
        return true
      }

      return false
    } catch (error) {
      console.error('Login failed:', error)
      return false
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Logout error:', error)
      }
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  if (!isClient) {
    return (
      <AuthContext.Provider value={{ 
        user: null, 
        session: null, 
        login: async () => false, 
        logout: async () => {}, 
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
```

### 2. **Simplified API Routes (No Custom JWT)**

```typescript
// pages/api/auth/login.ts - Simplified
import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../lib/supabase/server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' })
    }

    const supabase = createClient(req, res)
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error || !data.user) {
      return res.status(401).json({ error: 'Credenciales inválidas' })
    }

    // Return success - Supabase handles the session automatically
    return res.status(200).json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name || data.user.email?.split('@')[0]
      }
    })

  } catch (error) {
    console.error('Login error:', error)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}
```

### 3. **Middleware with Native Supabase Sessions**

```typescript
// middleware.ts - Using native Supabase sessions
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Protected routes
  const protectedRoutes = ['/dashboard', '/employees', '/departments', '/payroll', '/reports', '/settings']
  const isProtectedRoute = protectedRoutes.some(route => req.nextUrl.pathname.startsWith(route))

  if (isProtectedRoute && !session) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Public routes (redirect if logged in)
  const publicRoutes = ['/login']
  const isPublicRoute = publicRoutes.some(route => req.nextUrl.pathname.startsWith(route))

  if (isPublicRoute && session) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return res
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
```

---

## 🔧 Troubleshooting Credentials Issue

### Step 1: Check Production Environment Variables

```bash
# In your production environment (Railway/Vercel), ensure these are set:
NEXT_PUBLIC_SUPABASE_URL=https://fwyxmovfrzauebiqxchz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3eXhtb3ZmcnphdWViaXF4Y2h6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxODk5MjEsImV4cCI6MjA2Nzc2NTkyMX0.pXArDqHGA4yjprTqJfsNQXwzS-WLz6NCK5QRbLAyYmA
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3eXhtb3ZmcnphdWViaXF4Y2h6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjE4OTkyMSwiZXhwIjoyMDY3NzY1OTIxfQ.7tCj7HGw9MevF1Q9EEoOvD6CXf4M6f0iu37U-vjE76I
```

### Step 2: Create Users in Production Supabase

```javascript
// create-production-users.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createProductionUsers() {
  try {
    // Create admin user
    const { data: adminData, error: adminError } = await supabase.auth.admin.createUser({
      email: 'admin@empresa.com',
      password: 'admin123456',
      email_confirm: true,
      user_metadata: {
        name: 'Administrador'
      }
    })

    if (adminError) {
      console.error('Error creating admin:', adminError.message)
    } else {
      console.log('✅ Admin created:', adminData.user?.email)
    }

    // Create HR user
    const { data: hrData, error: hrError } = await supabase.auth.admin.createUser({
      email: 'hr@empresa.com',
      password: 'hr123456',
      email_confirm: true,
      user_metadata: {
        name: 'Recursos Humanos'
      }
    })

    if (hrError) {
      console.error('Error creating HR:', hrError.message)
    } else {
      console.log('✅ HR created:', hrData.user?.email)
    }

    // Create Jorge user
    const { data: jorgeData, error: jorgeError } = await supabase.auth.admin.createUser({
      email: 'jorge7gomez@gmail.com',
      password: 'jorge123456',
      email_confirm: true,
      user_metadata: {
        name: 'Jorge Gómez'
      }
    })

    if (jorgeError) {
      console.error('Error creating Jorge:', jorgeError.message)
    } else {
      console.log('✅ Jorge created:', jorgeData.user?.email)
    }

  } catch (err) {
    console.error('Error:', err)
  }
}

createProductionUsers()
```

### Step 3: Test Authentication

```bash
# Test with curl
curl -X POST https://your-production-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@empresa.com","password":"admin123456"}'
```

---

## 🎯 Advantages of Native Supabase Sessions

### 1. **Automatic Session Management**
- ✅ No need to manually handle JWT tokens
- ✅ Automatic token refresh
- ✅ Secure cookie-based sessions

### 2. **Real-time Updates**
- ✅ Session changes across tabs
- ✅ Automatic logout on token expiry
- ✅ Real-time user state synchronization

### 3. **Security Benefits**
- ✅ Built-in CSRF protection
- ✅ Secure cookie handling
- ✅ Automatic session validation

### 4. **Row Level Security (RLS)**
- ✅ Automatic user context in database queries
- ✅ Secure data access based on user role
- ✅ No need to pass user context manually

### 5. **Simplified Code**
- ✅ Less custom authentication logic
- ✅ Fewer security vulnerabilities
- ✅ Easier maintenance

---

## 🚀 Migration Steps

1. **Update AuthProvider** (use the simplified version above)
2. **Remove custom JWT logic** from API routes
3. **Update middleware** to use native sessions
4. **Create users in production** Supabase
5. **Test authentication** in production
6. **Remove JWT_SECRET** from environment variables

---

## 📋 Production Checklist

- [ ] Environment variables set in production
- [ ] Users created in production Supabase
- [ ] AuthProvider updated to use native sessions
- [ ] API routes simplified (no custom JWT)
- [ ] Middleware updated for native sessions
- [ ] Authentication tested in production
- [ ] RLS policies configured in Supabase

---

*This approach leverages Supabase's built-in session management, eliminating the need for custom JWT tokens and providing better security and maintainability.* 