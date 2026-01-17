import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '../supabase/server'
import { createClient } from '../supabase/server'
import { authenticateUser, AuthenticatedUser } from './api-auth-fixed'
import { logger } from '../logger'

export interface RequestIdentity {
  userId: string | null
  ip: string
  userAgent: string
  timestamp: Date
}

export interface AdminContext extends AuthenticatedUser {
  adminClient: any
  auditLog: (action: string, details: Record<string, any>) => Promise<void>
}

export interface SuperAdminContext extends AuthenticatedUser {
  adminClient: any
  auditLog: (action: string, details: Record<string, any>) => Promise<void>
}

/**
 * Extract request identity information for logging and security
 */
export function getRequestIdentity(req: NextApiRequest): RequestIdentity {
  const forwarded = req.headers['x-forwarded-for']
  const ip = Array.isArray(forwarded) 
    ? forwarded[0] 
    : typeof forwarded === 'string'
    ? forwarded.split(',')[0].trim()
    : req.socket.remoteAddress || 'unknown'

  return {
    userId: null, // Will be set after authentication
    ip,
    userAgent: req.headers['user-agent'] || 'unknown',
    timestamp: new Date()
  }
}

/**
 * Require a valid session (any authenticated user)
 */
export async function requireSession(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<AuthenticatedUser> {
  return authenticateUser(req, res, { requireProfile: false })
}

/**
 * Require specific role(s)
 */
export async function requireRole(
  req: NextApiRequest,
  res: NextApiResponse,
  roles: string[]
): Promise<AuthenticatedUser> {
  return authenticateUser(req, res, { allowedRoles: roles })
}

/**
 * Require tenant scope - ensures user can only access resources from their company
 */
export async function requireTenantScope(
  req: NextApiRequest,
  res: NextApiResponse,
  companyId: string | null | undefined,
  userCompanyId: string | null
): Promise<void> {
  if (!companyId) {
    if (!res.headersSent) {
      res.status(400).json({ error: 'Company ID is required' })
    }
    throw new Error('COMPANY_ID_REQUIRED')
  }

  if (!userCompanyId) {
    if (!res.headersSent) {
      res.status(403).json({ error: 'User must belong to a company' })
    }
    throw new Error('USER_COMPANY_REQUIRED')
  }

  if (companyId !== userCompanyId) {
    logger.warn('Tenant scope violation attempt', {
      requestedCompanyId: companyId,
      userCompanyId,
      ip: getRequestIdentity(req).ip
    })
    if (!res.headersSent) {
      res.status(403).json({ error: 'Access denied: company scope mismatch' })
    }
    throw new Error('TENANT_SCOPE_VIOLATION')
  }
}

/**
 * Require admin role with tenant scoping
 * Returns admin client and audit logging function
 */
export async function requireAdminWithTenant(
  req: NextApiRequest,
  res: NextApiResponse,
  options: {
    allowedRoles?: string[]
    requireTenantScope?: boolean
  } = {}
): Promise<AdminContext> {
  const { allowedRoles = ['company_admin', 'hr_manager', 'super_admin'], requireTenantScope = true } = options

  // Authenticate and check role
  const auth = await authenticateUser(req, res, { 
    allowedRoles,
    requireProfile: true 
  })

  const adminClient = createAdminClient()
  const identity = getRequestIdentity(req)
  identity.userId = auth.user.id

  // Audit logging function
  const auditLog = async (action: string, details: Record<string, any>) => {
    try {
      await logger.info('admin_action', {
        userId: auth.user.id,
        userEmail: auth.user.email,
        role: auth.role,
        companyId: auth.companyId,
        action,
        ...details,
        ip: identity.ip,
        userAgent: identity.userAgent,
        timestamp: identity.timestamp.toISOString()
      })
    } catch (error) {
      console.error('Failed to log admin action:', error)
      // Don't throw - logging failures shouldn't break the request
    }
  }

  return {
    ...auth,
    adminClient,
    auditLog
  }
}

/**
 * Require super admin role
 * Returns admin client and audit logging function
 */
export async function requireSuperAdminWithAudit(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<SuperAdminContext> {
  const auth = await authenticateUser(req, res, { 
    allowedRoles: ['super_admin'],
    requireProfile: true 
  })

  const adminClient = createAdminClient()
  const identity = getRequestIdentity(req)
  identity.userId = auth.user.id

  // Audit logging function
  const auditLog = async (action: string, details: Record<string, any>) => {
    try {
      await logger.info('super_admin_action', {
        userId: auth.user.id,
        userEmail: auth.user.email,
        action,
        ...details,
        ip: identity.ip,
        userAgent: identity.userAgent,
        timestamp: identity.timestamp.toISOString()
      })
    } catch (error) {
      console.error('Failed to log super admin action:', error)
      // Don't throw - logging failures shouldn't break the request
    }
  }

  return {
    ...auth,
    adminClient,
    auditLog
  }
}






