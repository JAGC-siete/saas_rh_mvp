import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../../lib/supabase/server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const supabase = createClient(req, res)
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Get user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Error fetching user profile:', profileError)
      return res.status(500).json({ error: 'Failed to fetch user profile' })
    }

    // Return the profile in the expected format
    return res.status(200).json({
      profiles: userProfile ? [userProfile] : []
    })

  } catch (error) {
    console.error('User profiles API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
