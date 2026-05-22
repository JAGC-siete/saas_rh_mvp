import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { serialize } from 'cookie'
import { NextApiRequest, NextApiResponse } from 'next'
import { cookies } from 'next/headers'
import { env } from '../env'

// Legacy API route client (for pages/api routes)
export function createClient(req: NextApiRequest, res: NextApiResponse) {
  // Get environment variables from centralized config
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Check if environment variables are available
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase environment variables')
    // Return a mock client to prevent server crash - API routes will fail but server stays up
    return createServerClient('https://placeholder.supabase.co', 'placeholder-key', {
      cookies: {
        get: () => undefined,
        set: () => {},
        remove: () => {}
      }
    })
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return req.cookies[name]
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          // Set maxAge to 1 day for auth cookies to match JWT expiry
          const isAuthCookie = name.includes('sb-') && name.includes('auth-token')
          const cookieMaxAge = isAuthCookie && !options?.maxAge 
            ? 24 * 60 * 60 // 1 day in seconds
            : options?.maxAge

          const cookie = serialize(name, value, {
            path: options?.path ?? '/',
            httpOnly: options?.httpOnly ?? true,
            secure: options?.secure ?? process.env.NODE_ENV === 'production',
            sameSite: (options?.sameSite as any) ?? 'lax',
            domain: options?.domain,
            maxAge: cookieMaxAge,
            expires: options?.expires,
          })

          const prev = res.getHeader('Set-Cookie')
          if (!prev) {
            res.setHeader('Set-Cookie', cookie)
          } else if (Array.isArray(prev)) {
            res.setHeader('Set-Cookie', [...prev, cookie])
          } else {
            res.setHeader('Set-Cookie', [prev as string, cookie])
          }
        } catch (error) {
          console.warn('Failed to set cookie:', name, error)
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          const cookie = serialize(name, '', {
            path: options?.path ?? '/',
            httpOnly: options?.httpOnly ?? true,
            secure: options?.secure ?? process.env.NODE_ENV === 'production',
            sameSite: (options?.sameSite as any) ?? 'lax',
            domain: options?.domain,
            maxAge: 0,
            expires: new Date(0),
          })

          const prev = res.getHeader('Set-Cookie')
          if (!prev) {
            res.setHeader('Set-Cookie', cookie)
          } else if (Array.isArray(prev)) {
            res.setHeader('Set-Cookie', [...prev, cookie])
          } else {
            res.setHeader('Set-Cookie', [prev as string, cookie])
          }
        } catch (error) {
          console.warn('Failed to remove cookie:', name, error)
        }
      },
    },
  })
}

// App Router client (for server components and middleware)
export async function createServerComponentClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set(name, value, options)
          } catch {
            // Handle errors when setting cookies in server components
            console.warn('Failed to set cookie in server component:', name)
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set(name, '', { ...options, maxAge: 0 })
          } catch {
            // Handle errors when removing cookies in server components
            console.warn('Failed to remove cookie in server component:', name)
          }
        }
      }
    }
  )
}

// Admin client for server-side operations with service role
export function createAdminClient() {
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL for admin client')
  }

  if (!serviceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY for admin client')
  }

  return createSupabaseClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
