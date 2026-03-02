import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '../../../lib/supabase/server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId } = req.body

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: 'User ID is required' })
    }

    // SECURITY: Only allow the authenticated user to create their own profile
    // (e.g. after magic link verification - session cookies are set by Supabase)
    const supabaseServer = createServerClient(req, res)
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser()

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    if (user.id !== userId) {
      return res.status(403).json({ error: 'Forbidden: userId must match authenticated user' })
    }

    // Use service role key to bypass RLS for profile creation
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', userId)
      .single()

    if (existingProfile) {
      return res.status(200).json({ success: true, message: 'Profile already exists' })
    }

    // Create user profile (company_id nullable for super_admin onboarding flow)
    const { error } = await supabase
      .from('user_profiles')
      .insert({
        id: userId,
        role: 'super_admin',
        is_active: true,
        permissions: {
          can_manage_employees: true,
          can_view_payroll: true,
          can_manage_attendance: true,
          can_manage_departments: true,
          can_view_reports: true,
          can_manage_companies: true,
          can_generate_payroll: true,
          can_export_payroll: true,
          can_view_own_attendance: true,
          can_register_attendance: true
        }
      })

    if (error) {
      console.error('Error creating user profile:', error)
      return res.status(500).json({ error: 'Failed to create user profile', details: error.message })
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Error in fix-user-creation API:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
