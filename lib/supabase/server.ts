import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextApiRequest, NextApiResponse } from 'next'

export function createClient(req: NextApiRequest, res: NextApiResponse) {
  // Get environment variables directly
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  // Check if environment variables are available
  if (!supabaseUrl || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error('Missing Supabase environment variables')
    throw new Error('Supabase environment variables are not configured')
  }

  return createServerClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return req.cookies[name]
      },
      set(name: string, value: string, options: CookieOptions) {
        res.setHeader('Set-Cookie', [
          `${name}=${value}; Path=/; ${options.httpOnly ? 'HttpOnly;' : ''} ${options.secure ? 'Secure;' : ''} SameSite=${options.sameSite || 'Lax'}`
        ])
      },
      remove(name: string, options: CookieOptions) {
        res.setHeader('Set-Cookie', [
          `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; ${options.httpOnly ? 'HttpOnly;' : ''} ${options.secure ? 'Secure;' : ''} SameSite=${options.sameSite || 'Lax'}`
        ])
      },
    },
  })
}

// Admin client for server-side operations with service role
export function createAdminClient() {
  // Get environment variables directly
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Check if environment variables are available
  if (!supabaseUrl) {
    console.error('Missing Supabase URL environment variable (NEXT_PUBLIC_SUPABASE_URL)')
    throw new Error('Supabase environment variables are not configured')
  }

  // Prefer service role for server-side operations; fall back to anon to avoid hard crashes.
  // Note: For production, ensure RPCs required by dashboards are SECURITY DEFINER so anon can execute safely.
  const keyToUse = serviceKey || anonKey
  if (!keyToUse) {
    console.error('Missing Supabase keys (SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_ANON_KEY)')
    throw new Error('Supabase environment variables are not configured')
  }

  if (!serviceKey) {
    console.warn('SUPABASE_SERVICE_ROLE_KEY is missing. Falling back to anon key for server client.')
  }

  return createServerClient(supabaseUrl, keyToUse, {
    cookies: {
      get() { return undefined },
      set() {},
      remove() {},
    },
  })
}
