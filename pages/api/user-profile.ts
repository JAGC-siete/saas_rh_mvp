import { NextApiRequest, NextApiResponse } from 'next'
import { createClient, createAdminClient } from '../../lib/supabase/server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const supabase = createClient(req, res)

    // Get user from auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Get user profile - use admin client to bypass RLS (CRITICAL FIX)
    const adminSupabase = createAdminClient()
    const { data: userProfile, error: profileError } = await adminSupabase
      .from('user_profiles')
      .select(`
        id,
        company_id,
        employee_id,
        role,
        permissions
      `)
      .eq('id', user.id)
      .maybeSingle() // Use maybeSingle() to handle 0 rows gracefully

    if (profileError) {
      console.error('❌ [user-profile API] Error fetching user profile:', profileError)
      console.error('❌ [user-profile API] Error details:', {
        code: profileError.code,
        message: profileError.message,
        details: profileError.details,
        hint: profileError.hint
      })
      return res.status(500).json({ 
        error: 'Failed to fetch user profile',
        details: profileError.message,
        code: profileError.code
      })
    }

    if (!userProfile) {
      console.warn('⚠️ [user-profile API] User profile not found for user:', user.id)
      return res.status(404).json({ 
        error: 'User profile not found',
        userId: user.id,
        email: user.email
      })
    }

    console.log('✅ [user-profile API] User profile found:', {
      userId: userProfile.id,
      companyId: userProfile.company_id,
      role: userProfile.role,
      hasEmployeeId: !!userProfile.employee_id
    })

    res.status(200).json({
      success: true,
      data: userProfile
    })

  } catch (error) {
    console.error('User profile API error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
