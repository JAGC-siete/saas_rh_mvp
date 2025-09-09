import { NextApiRequest, NextApiResponse } from 'next'
import { createServerClient } from '@supabase/ssr'

export interface AuthenticatedUser {
  supabase: any
  user: any
  userProfile: any
  companyId: string | null
  role: string
}

export interface AuthOptions {
  requireProfile?: boolean
  requireAdmin?: boolean
  allowedRoles?: string[]
}

/**
 * Standardized authentication for API endpoints
 * This replaces the inconsistent authentication patterns across APIs
 */
export async function authenticateUser(
  req: NextApiRequest, 
  res: NextApiResponse,
  options: AuthOptions = {}
): Promise<AuthenticatedUser> {
  const { requireProfile = true, requireAdmin = false, allowedRoles = [] } = options

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
      res.status(401).json({ error: 'Unauthorized' })
      throw new Error('UNAUTHORIZED')
    }

    // Get user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('company_id, role, employee_id, permissions, is_active')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile) {
      if (requireProfile) {
        res.status(403).json({ error: 'User profile required' })
        throw new Error('PROFILE_REQUIRED')
      }
      // Return basic user without profile
      return { 
        supabase, 
        user, 
        userProfile: null, 
        companyId: null, 
        role: 'employee' 
      }
    }

    // Check if user is active
    if (!userProfile.is_active) {
      res.status(403).json({ error: 'Account deactivated' })
      throw new Error('ACCOUNT_DEACTIVATED')
    }

    // Check admin requirements
    if (requireAdmin && !['super_admin', 'company_admin', 'hr_manager'].includes(userProfile.role)) {
      res.status(403).json({ error: 'Admin privileges required' })
      throw new Error('ADMIN_REQUIRED')
    }

    // Check allowed roles
    if (allowedRoles.length > 0 && !allowedRoles.includes(userProfile.role)) {
      res.status(403).json({ error: 'Insufficient permissions' })
      throw new Error('INSUFFICIENT_PERMISSIONS')
    }

    return { 
      supabase, 
      user, 
      userProfile, 
      companyId: userProfile.company_id, 
      role: userProfile.role 
    }
  } catch (error) {
    console.error('Authentication error:', error)
    throw error
  }
}

/**
 * Helper for admin-only endpoints
 */
export async function requireAdmin(req: NextApiRequest, res: NextApiResponse): Promise<AuthenticatedUser> {
  return authenticateUser(req, res, { requireAdmin: true })
}

/**
 * Helper for endpoints that need specific roles
 */
export async function requireRoles(req: NextApiRequest, res: NextApiResponse, roles: string[]): Promise<AuthenticatedUser> {
  return authenticateUser(req, res, { allowedRoles: roles })
}

/**
 * Helper for company-scoped endpoints
 */
export async function requireCompanyAccess(req: NextApiRequest, res: NextApiResponse): Promise<AuthenticatedUser> {
  const auth = await authenticateUser(req, res, { requireProfile: true })
  
  if (!auth.companyId) {
    res.status(400).json({ error: 'Company access required' })
    throw new Error('COMPANY_ACCESS_REQUIRED')
  }
  
  return auth
}
