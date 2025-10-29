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

    // Get user profile - use optional() to allow for missing profiles
    const { data: profiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)

    if (profileError) {
      console.error('Error fetching user profile:', profileError)
      // Return empty array instead of error to allow login to proceed
      return res.status(200).json({
        profiles: [],
        error: profileError.message
      })
    }

    // Return the profile in the expected format
    return res.status(200).json({
      profiles: profiles || []
    })

  } catch (error) {
    console.error('User profiles API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
