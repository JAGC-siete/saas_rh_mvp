import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextApiRequest, NextApiResponse } from 'next'
import { validateEnvironmentVariables, env } from '../env-validation'

export function createClient(req: NextApiRequest, res: NextApiResponse) {
  // Validate environment variables
  validateEnvironmentVariables()

  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
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
  // Validate environment variables
  validateEnvironmentVariables()

  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    cookies: {
      get() { return undefined },
      set() {},
      remove() {},
    },
  })
}
