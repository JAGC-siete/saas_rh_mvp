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

    // Get user profile to verify company access
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile) {
      return res.status(403).json({ error: 'Access denied' })
    }

    const { company_id, employee_id } = req.query

    if (!company_id) {
      return res.status(400).json({ error: 'Company ID is required' })
    }

    // Verify user has access to this company
    if (userProfile.company_id !== company_id && userProfile.role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied to this company' })
    }

    let query = supabase
      .from('employee_achievements')
      .select(`
        *,
        achievement_type:achievement_types(*)
      `)
      .eq('company_id', company_id)

    // If employee_id is provided, filter by specific employee
    if (employee_id) {
      query = query.eq('employee_id', employee_id)
    }

    const { data: achievements, error } = await query

    if (error) {
      console.error('Achievements fetch error:', error)
      return res.status(500).json({ error: 'Failed to fetch achievements' })
    }

    res.status(200).json({
      success: true,
      data: achievements || [],
      total: achievements?.length || 0
    })

  } catch (error) {
    console.error('Achievements API error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
