import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../../lib/supabase/server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get all cookies
    const cookies = req.headers.cookie || ''
    console.log('🍪 All cookies:', cookies)

    // Parse cookies
    const cookieMap: Record<string, string> = {}
    cookies.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=')
      if (name && value) {
        cookieMap[name] = value
      }
    })

    // Check for Supabase auth cookies
    const supabaseCookies = Object.keys(cookieMap).filter(key => key.includes('sb-'))
    console.log('🔐 Supabase cookies found:', supabaseCookies)

    // Try to create Supabase client and get user
    const supabase = createClient(req, res)
    const { data: { user }, error } = await supabase.auth.getUser()

    return res.status(200).json({
      success: true,
      auth: {
        user: user ? {
          id: user.id,
          email: user.email,
          role: user.role
        } : null,
        error: error?.message || null
      },
      cookies: {
        total: Object.keys(cookieMap).length,
        supabase: supabaseCookies,
        all: cookieMap
      }
    })

  } catch (error: any) {
    console.error('Auth status debug error:', error)
    return res.status(500).json({
      error: error.message || 'Internal server error'
    })
  }
}
