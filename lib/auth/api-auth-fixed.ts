import { NextApiRequest, NextApiResponse } from 'next'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { createAdminClient } from '../supabase/server'

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
  allowSuperAdminWithoutCompany?: boolean
}

/**
 * Standardized authentication for API endpoints - FIXED VERSION
 * This version handles super_admin without company_id correctly
 */
export async function authenticateUser(
  req: NextApiRequest, 
  res: NextApiResponse,
  options: AuthOptions = {}
): Promise<AuthenticatedUser> {
  const { 
    requireProfile = true, 
    requireAdmin = false, 
    allowedRoles = [],
    allowSuperAdminWithoutCompany = true
  } = options

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
      console.error('Auth error:', authError)
      res.status(401).json({ error: 'Unauthorized' })
      throw new Error('UNAUTHORIZED')
    }

    // Get user profile - use admin client to bypass RLS (CRITICAL FIX)
    const adminSupabase = createAdminClient()
    
    const { data: userProfile, error: profileError } = await adminSupabase
      .from('user_profiles')
      .select('company_id, role, employee_id, permissions, is_active')
      .eq('id', user.id)
      .maybeSingle() // Use maybeSingle() to handle 0 rows gracefully

    if (profileError) {
      console.error('Profile query error:', profileError)
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

    if (!userProfile) {
      if (requireProfile) {
        res.status(403).json({ error: 'User profile not found' })
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

    const normalizedRole = (userProfile.role || '').trim().toLowerCase()

    // Check admin requirements
    if (requireAdmin && !['super_admin', 'company_admin', 'hr_manager'].includes(normalizedRole)) {
      res.status(403).json({ error: 'Admin privileges required' })
      throw new Error('ADMIN_REQUIRED')
    }

    // Check allowed roles
    if (allowedRoles.length > 0 && !allowedRoles.map(r => r.trim().toLowerCase()).includes(normalizedRole)) {
      res.status(403).json({ error: 'Insufficient permissions' })
      throw new Error('INSUFFICIENT_PERMISSIONS')
    }

    return { 
      supabase, 
      user, 
      userProfile, 
      companyId: userProfile.company_id, 
      role: normalizedRole 
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
 * Helper for company-scoped endpoints - FIXED VERSION
 * Now handles super_admin without company_id correctly
 */
export async function requireCompanyAccess(req: NextApiRequest, res: NextApiResponse): Promise<AuthenticatedUser> {
  const auth = await authenticateUser(req, res, { requireProfile: true })
  
  // FIXED: Permitir super_admin sin company_id
  if (!auth.companyId && auth.role !== 'super_admin') {
    res.status(400).json({ error: 'Company access required' })
    throw new Error('COMPANY_ACCESS_REQUIRED')
  }
  
  return auth
}

/**
 * Helper for super admin only endpoints
 */
export async function requireSuperAdmin(req: NextApiRequest, res: NextApiResponse): Promise<AuthenticatedUser> {
  return authenticateUser(req, res, { allowedRoles: ['super_admin'] })
}
