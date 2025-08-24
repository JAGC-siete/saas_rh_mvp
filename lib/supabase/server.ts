import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { serialize } from 'cookie'
import { NextApiRequest, NextApiResponse } from 'next'
import { env } from '../env'

export function createClient(req: NextApiRequest, res: NextApiResponse) {
  // Get environment variables from centralized config
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Check if environment variables are available
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase environment variables')
    throw new Error('Supabase environment variables are not configured')
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return req.cookies[name]
      },
      set(name: string, value: string, options: CookieOptions) {
        const cookie = serialize(name, value, {
          path: options?.path ?? '/',
          httpOnly: options?.httpOnly ?? false,
          secure: options?.secure ?? false,
          sameSite: (options?.sameSite as any) ?? 'lax',
          domain: options?.domain,
          maxAge: options?.maxAge,
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
      },
      remove(name: string, options: CookieOptions) {
        const cookie = serialize(name, '', {
          path: options?.path ?? '/',
          httpOnly: options?.httpOnly ?? false,
          secure: options?.secure ?? false,
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
      },
    },
  })
}

// Admin client for server-side operations with service role
export function createAdminClient() {
  // Get environment variables from centralized config
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Check if environment variables are available
  if (!supabaseUrl) {
    console.error('❌ Missing Supabase URL environment variable (NEXT_PUBLIC_SUPABASE_URL)')
    throw new Error('Supabase environment variables are not configured')
  }

  // Prefer service role for server-side operations; fall back to anon to avoid hard crashes.
  // Note: For production, ensure RPCs required by dashboards are SECURITY DEFINER so anon can execute safely.
  const keyToUse = serviceKey || anonKey
  if (!keyToUse) {
    console.error('❌ Missing Supabase keys (SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_ANON_KEY)')
    throw new Error('Supabase environment variables are not configured')
  }

  if (!serviceKey) {
    console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY is missing. Falling back to anon key for server client.')
  }

  return createServerClient(supabaseUrl, keyToUse, {
    cookies: {
      get() { return undefined },
      set() {},
      remove() {},
    },
  })
}
