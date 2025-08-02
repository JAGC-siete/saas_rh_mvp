# 🔐 Supabase Session Management - 12-Factor App Guide

## 🎯 Overview

This guide shows how to properly implement Supabase session management while following 12-factor app principles, especially **Factor VI (Stateless)** and **Factor III (Config)**.

## 🏗️ Architecture Benefits

### ✅ **12-Factor Compliance**
- **Factor VI (Stateless)**: No server-side session storage
- **Factor III (Config)**: Environment-based configuration
- **Factor VIII (Concurrency)**: Stateless, scales horizontally
- **Factor X (Dev/Prod Parity)**: Same code, different configs

### ✅ **Supabase Advantages**
- **Built-in session management**: Automatic token refresh
- **Row Level Security (RLS)**: Database-level security
- **Real-time subscriptions**: Live data updates
- **Edge Functions**: Serverless authentication

## 🔧 Implementation

### 1. **Environment Configuration (Factor III)**

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. **Supabase Client Setup**

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error('Missing Supabase environment variables')
  }

  return createBrowserClient(url, key)
}
```

### 3. **12-Factor AuthProvider**

```typescript
// lib/auth-12factor.tsx
import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from './supabase/client'
import { User, Session } from '@supabase/supabase-js'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [isClient, setIsClient] = useState(false) // Factor VI: Stateless during SSR
  const supabase = createClient()

  // Factor VI: Client-side detection
  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!isClient) return

    // Get initial session from Supabase (Factor VI: Stateless)
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    }

    getInitialSession()

    // Listen for auth changes (Supabase handles session management)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)

        // Factor VI: Client-side redirects only
        if (isClient && typeof window !== 'undefined') {
          if (event === 'SIGNED_IN' && window.location.pathname === '/login') {
            window.location.href = '/dashboard'
          } else if (event === 'SIGNED_OUT') {
            window.location.href = '/login'
          }
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [isClient, supabase.auth])

  // Factor VI: Return initial state during SSR
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
```

### 4. **Login Function (12-Factor Compliant)**

```typescript
const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
  try {
    setLoading(true)
    
    // Use Supabase Auth directly (Factor VI: Stateless)
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      return { success: false, error: error.message }
    }

    if (data.user) {
      return { success: true }
    }

    return { success: false, error: 'No user data returned' }
  } catch (error) {
    return { success: false, error: 'Login failed' }
  } finally {
    setLoading(false)
  }
}
```

### 5. **Middleware Integration (Factor VI)**

```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Factor VI: Stateless session validation
  const { data: { session } } = await supabase.auth.getSession()

  // Protect routes
  if (!session && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}
```

## 🔍 Troubleshooting

### **"Credenciales inválidas" Error**

**Possible Causes:**
1. **Environment Variables**: Check if Supabase keys are correct
2. **User Creation**: Verify users exist in Supabase Auth
3. **Password**: Ensure correct password format
4. **Network**: Check CORS and network connectivity

**Debug Steps:**
```bash
# 1. Check environment variables
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY

# 2. Test API directly
curl -X POST https://your-domain.com/api/auth/login-supabase \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@empresa.com","password":"admin123456"}'

# 3. Check Supabase Dashboard
# Go to Authentication > Users to verify user exists
```

### **Session Management Issues**

**Common Problems:**
1. **Token Expiry**: Supabase handles automatic refresh
2. **CORS Issues**: Configure allowed origins in Supabase
3. **Cookie Issues**: Ensure proper cookie settings

**Solutions:**
```typescript
// Enable debug logging
const supabase = createClient()
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth event:', event)
  console.log('Session:', session)
})
```

## 🚀 Best Practices

### **1. Factor VI (Stateless)**
- ✅ No server-side session storage
- ✅ Use Supabase's built-in session management
- ✅ Client-side state only
- ✅ Stateless during SSR/build

### **2. Factor III (Config)**
- ✅ Environment variables for all config
- ✅ No hardcoded values
- ✅ Different configs for dev/prod

### **3. Security**
- ✅ Use RLS policies in Supabase
- ✅ Validate sessions on every request
- ✅ Proper CORS configuration
- ✅ Secure cookie settings

### **4. Performance**
- ✅ Automatic token refresh
- ✅ Minimal client-side state
- ✅ Efficient session validation
- ✅ Edge-compatible authentication

## 📊 Monitoring

### **Session Metrics**
```typescript
// Track authentication events
supabase.auth.onAuthStateChange((event, session) => {
  // Log to your monitoring service
  console.log('Auth event:', {
    event,
    userId: session?.user?.id,
    timestamp: new Date().toISOString()
  })
})
```

### **Error Tracking**
```typescript
const login = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) {
      // Log error for monitoring
      console.error('Login error:', {
        email,
        error: error.message,
        timestamp: new Date().toISOString()
      })
    }
  } catch (error) {
    // Handle unexpected errors
  }
}
```

## 🎯 Migration Guide

### **From Custom Auth to Supabase**

1. **Replace custom login API** with Supabase Auth
2. **Update AuthProvider** to use Supabase sessions
3. **Remove server-side session storage**
4. **Update middleware** to use Supabase session validation
5. **Test thoroughly** in development and staging

### **Benefits After Migration**
- ✅ **Simplified codebase**: Less custom auth code
- ✅ **Better security**: Supabase handles security best practices
- ✅ **Automatic scaling**: Stateless architecture
- ✅ **Real-time features**: Built-in subscriptions
- ✅ **Edge compatibility**: Works with Edge Runtime

---

*This guide ensures your authentication system follows 12-factor app principles while leveraging Supabase's powerful session management capabilities.* 