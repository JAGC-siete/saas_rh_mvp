import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../lib/supabase/server'
import { createAdminClient } from '../../lib/supabase/server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const supabase = createClient(req, res)

    const authHeader = req.headers.authorization
    const bearer =
      typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7).trim()
        : null

    // Cookies first; Bearer only if cookie session missing (auth.tsx may send both)
    let { data: { user }, error: authError } = await supabase.auth.getUser()
    if ((!user || authError) && bearer) {
      const bearerResult = await supabase.auth.getUser(bearer)
      if (bearerResult.data.user) {
        user = bearerResult.data.user
        authError = bearerResult.error
      }
    }
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Get user profile - use admin client to bypass RLS (CRITICAL FIX)
    const adminSupabase = createAdminClient()
    const { data: userProfile, error: profileError } = await adminSupabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle() // Use maybeSingle() to handle 0 rows gracefully

    if (profileError) {
      console.error('Error fetching user profile:', profileError)
      return res.status(500).json({ error: 'Failed to fetch user profile' })
    }

    if (!userProfile) {
      console.warn('User profile not found for user:', user.id)
      return res.status(200).json({
        profiles: []
      })
    }

    // Return the profile in the expected format
    return res.status(200).json({
      profiles: [userProfile]
    })

  } catch (error) {
    console.error('User profiles API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
