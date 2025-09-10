import { NextApiRequest, NextApiResponse } from 'next'
import { createServerClient } from '@supabase/ssr'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Create Supabase client with cookies from request
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return req.cookies[name]
          },
          set() {},
          remove() {},
        },
      }
    )

    // Get user from auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Get user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select(`
        *,
        employees(name, email, position),
        companies(name, is_active)
      `)
      .eq('id', user.id)
      .single()

    if (profileError) {
      if (profileError.code === 'PGRST116') {
        return res.status(404).json({ error: 'User profile not found' })
      }
      throw profileError
    }

    return res.json(userProfile)

  } catch (error: any) {
    console.error('Get user profile error:', error)
    return res.status(500).json({ 
      error: error.message || 'Internal server error' 
    })
  }
}
