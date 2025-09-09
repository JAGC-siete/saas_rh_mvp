import { NextApiRequest, NextApiResponse } from 'next'
import { createServerClient } from '@supabase/ssr'

export interface AuthenticatedUser {
  supabase: any
  user: any
  userProfile?: any
}

export async function requireUser(req: NextApiRequest, res: NextApiResponse): Promise<AuthenticatedUser> {
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
      throw new Error('UNAUTHORIZED')
    }

    // Get user profile to verify company access
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('company_id, role, employee_id, permissions')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.warn('User profile not found, continuing without profile data:', profileError)
    }

    return { supabase, user, userProfile }
  } catch (error) {
    console.error('Authentication error:', error)
    throw new Error('UNAUTHORIZED')
  }
}

export async function requireUserWithProfile(req: NextApiRequest, res: NextApiResponse): Promise<AuthenticatedUser> {
  const { supabase, user, userProfile } = await requireUser(req, res)
  
  if (!userProfile) {
    throw new Error('PROFILE_REQUIRED')
  }
  
  return { supabase, user, userProfile }
}

export async function requireAdmin(req: NextApiRequest, res: NextApiResponse): Promise<AuthenticatedUser> {
  const { supabase, user, userProfile } = await requireUserWithProfile(req, res)
  
  if (!['super_admin', 'company_admin', 'hr_manager'].includes(userProfile.role)) {
    throw new Error('ADMIN_REQUIRED')
  }
  
  return { supabase, user, userProfile }
}
