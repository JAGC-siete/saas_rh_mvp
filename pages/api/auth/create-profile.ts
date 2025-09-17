import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../../../lib/supabase/server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId } = req.body

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' })
    }

    const supabase = createAdminClient()

    // Create user profile
    const { error } = await supabase.rpc('create_user_profile', {
      user_id: userId
    })

    if (error) {
      console.error('Error creating user profile:', error)
      return res.status(500).json({ error: 'Failed to create user profile' })
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Error in create-profile API:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
