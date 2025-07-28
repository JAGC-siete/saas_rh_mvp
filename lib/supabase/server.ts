<<<<<<< HEAD
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
=======
import { createServerClient, type CookieOptions } from '@supabase/ssr'
>>>>>>> 5e8f55382ace57d852b356fc491e754b1fd1b556
import { NextApiRequest, NextApiResponse } from 'next'

export function createClient(req: NextApiRequest, res: NextApiResponse) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error('Missing Supabase environment variables')
  }

<<<<<<< HEAD
  return createSupabaseClient(url, key, {
    auth: {
      autoRefreshToken: true,
      persistSession: false
    }
=======
  return createServerClient(url, key, {
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
>>>>>>> 5e8f55382ace57d852b356fc491e754b1fd1b556
  })
}

// Admin client for server-side operations with service role
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error('Missing Supabase admin environment variables')
  }

<<<<<<< HEAD
  // Use the basic createClient for admin operations
  return createSupabaseClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
=======
  return createServerClient(url, serviceKey, {
    cookies: {
      get() { return undefined },
      set() {},
      remove() {},
    },
>>>>>>> 5e8f55382ace57d852b356fc491e754b1fd1b556
  })
}
