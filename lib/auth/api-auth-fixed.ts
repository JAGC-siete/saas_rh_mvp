import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../supabase/server'
import { createAdminClient } from '../supabase/server'
import { normalizeCountryCode, type CountryCode } from '../country/supported'
import { timezoneForCountry } from '../country/payroll-labels'

export interface AuthenticatedUser {
  supabase: any
  user: any
  userProfile: any
  companyId: string | null
  /** ISO 3166-1 alpha-3 from companies.country_code; null sin empresa */
  companyCountryCode: CountryCode | null
  /** IANA; inferido por país si companies.timezone es null; null sin empresa */
  companyTimezone: string | null
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
    // Create Supabase client with cookies from request - USAR createClient de server.ts
    const supabase = createClient(req, res)

    // Get user from auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      // Check if response has already been sent
      if (!res.headersSent) {
        res.status(401).json({ error: 'Unauthorized' })
      }
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
        if (!res.headersSent) {
          res.status(403).json({ error: 'User profile required' })
        }
        throw new Error('PROFILE_REQUIRED')
      }
      // Return basic user without profile
      return { 
        supabase, 
        user, 
        userProfile: null, 
        companyId: null, 
        companyCountryCode: null,
        companyTimezone: null,
        role: 'employee' 
      }
    }

    if (!userProfile) {
      if (requireProfile) {
        if (!res.headersSent) {
          res.status(403).json({ error: 'User profile not found' })
        }
        throw new Error('PROFILE_REQUIRED')
      }
      // Return basic user without profile
      return { 
        supabase, 
        user, 
        userProfile: null, 
        companyId: null, 
        companyCountryCode: null,
        companyTimezone: null,
        role: 'employee' 
      }
    }

    // Check if user is active
    if (!userProfile.is_active) {
      if (!res.headersSent) {
        res.status(403).json({ error: 'Account deactivated' })
      }
      throw new Error('ACCOUNT_DEACTIVATED')
    }

    const normalizedRole = (userProfile.role || '').trim().toLowerCase()

    // Check admin requirements
    if (requireAdmin && !['super_admin', 'company_admin', 'hr_manager'].includes(normalizedRole)) {
      if (!res.headersSent) {
        res.status(403).json({ error: 'Admin privileges required' })
      }
      throw new Error('ADMIN_REQUIRED')
    }

    // Check allowed roles
    if (allowedRoles.length > 0 && !allowedRoles.map(r => r.trim().toLowerCase()).includes(normalizedRole)) {
      if (!res.headersSent) {
        res.status(403).json({ error: 'Insufficient permissions' })
      }
      throw new Error('INSUFFICIENT_PERMISSIONS')
    }

    let companyCountryCode: CountryCode | null = null
    let companyTimezone: string | null = null
    if (userProfile.company_id) {
      const { data: co } = await adminSupabase
        .from('companies')
        .select('country_code, timezone')
        .eq('id', userProfile.company_id)
        .maybeSingle()
      companyCountryCode = normalizeCountryCode(co?.country_code)
      const tzRaw = co?.timezone
      companyTimezone =
        typeof tzRaw === 'string' && tzRaw.trim().length > 0
          ? tzRaw.trim()
          : timezoneForCountry(companyCountryCode)
    }

    return { 
      supabase, 
      user, 
      userProfile, 
      companyId: userProfile.company_id, 
      companyCountryCode,
      companyTimezone,
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
    if (!res.headersSent) {
      res.status(400).json({ error: 'Company access required' })
    }
    throw new Error('COMPANY_ACCESS_REQUIRED')
  }
  
  return auth
}

/**
 * Helper for super admin only endpoints
 * 
 * @deprecated Use requireSuperAdminWithAudit from api-guards.ts for new code
 * This function is kept for backwards compatibility
 */
export async function requireSuperAdmin(req: NextApiRequest, res: NextApiResponse): Promise<AuthenticatedUser> {
  return authenticateUser(req, res, { allowedRoles: ['super_admin'] })
}
