/**
 * Admin API wrapper with automatic logging and role validation
 * Simplifies admin API development with consistent patterns
 */

import { NextApiRequest, NextApiResponse } from 'next'
import { createClient, createAdminClient } from '../supabase/server'
import { logger } from '../logger'
import { 
  logAdminOperationStart, 
  logAdminOperationComplete, 
  logAdminOperationError,
  createAdminContext,
  ADMIN_OPERATIONS,
  ADMIN_RESOURCES,
  AdminOperationContext
} from '../logging/admin-logger'
import { validateUserPermissions } from './role-validation'

export interface AdminApiHandler {
  GET?: (req: NextApiRequest, res: NextApiResponse, context: AdminApiContext) => Promise<void>
  POST?: (req: NextApiRequest, res: NextApiResponse, context: AdminApiContext) => Promise<void>
  PUT?: (req: NextApiRequest, res: NextApiResponse, context: AdminApiContext) => Promise<void>
  DELETE?: (req: NextApiRequest, res: NextApiResponse, context: AdminApiContext) => Promise<void>
  PATCH?: (req: NextApiRequest, res: NextApiResponse, context: AdminApiContext) => Promise<void>
}

export interface AdminApiContext {
  supabase: any
  user: any
  userProfile: any
  operation: string
  resource: string
  resourceId?: string
  metadata?: Record<string, any>
}

export interface AdminApiConfig {
  operation: string
  resource: string
  requireSuperAdmin?: boolean
  requireCompanyAccess?: boolean
  allowedMethods?: string[]
}

/**
 * Create admin API handler with automatic logging and validation
 */
export function createAdminApiHandler(
  config: AdminApiConfig,
  handlers: AdminApiHandler
) {
  return async function adminApiHandler(req: NextApiRequest, res: NextApiResponse) {
    const startTime = Date.now()
    let userProfile: any = null
    let operationContext: AdminOperationContext | null = null

    try {
      // Validate HTTP method
      const allowedMethods = config.allowedMethods || ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
      if (!allowedMethods.includes(req.method || '')) {
        res.setHeader('Allow', allowedMethods)
        return res.status(405).json({ error: 'Method not allowed' })
      }

      // Create clients: auth (cookie-based) and admin (service role) for DB operations
      const authClient = createClient(req, res)
      const dbClient = config.requireSuperAdmin ? createAdminClient() : authClient

      // Get authenticated user
      const { data: { user }, error: userError } = await authClient.auth.getUser()
      
      if (userError || !user) {
        logger.warn('Unauthenticated admin API access attempt', { 
          path: req.url,
          method: req.method 
        })
        return res.status(401).json({ error: 'Authentication required' })
      }

      // Get user profile with extended information
      const { data: profile, error: profileError } = await dbClient
        .from('user_profiles')
        .select('id, role, company_id, is_active')
        .eq('id', user.id)
        .single()

      if (profileError || !profile) {
        logger.warn('User profile not found for admin API access', { 
          path: req.url,
          method: req.method,
          userId: user.id,
          error: profileError?.message
        })
        return res.status(403).json({ error: 'User profile not found' })
      }

      userProfile = profile
      operationContext = createAdminContext(req, profile)

      // Validate permissions
      const validation = validateUserPermissions(profile, req.url || '', profile.company_id)
      
      if (!validation.hasAccess) {
        logAdminOperationError(
          config.operation,
          config.resource,
          operationContext,
          validation.reason || 'Insufficient permissions',
          403,
          undefined,
          { requiredRoles: validation.requiredRoles }
        )
        return res.status(403).json({ error: 'Insufficient permissions' })
      }

      // Extract resource ID from URL if present
      const resourceId = extractResourceId(req.url || '')

      // Log operation start
      logAdminOperationStart(
        config.operation,
        config.resource,
        operationContext,
        resourceId,
        { body: req.body }
      )

      // Create API context
      const apiContext: AdminApiContext = {
        supabase: dbClient,
        user,
        userProfile: profile,
        operation: config.operation,
        resource: config.resource,
        resourceId,
        metadata: {
          method: req.method,
          path: req.url,
          timestamp: new Date().toISOString()
        }
      }

      // Execute handler based on HTTP method
      const method = req.method as keyof AdminApiHandler
      const handler = handlers[method]

      if (!handler) {
        return res.status(405).json({ error: 'Method not allowed' })
      }

      await handler(req, res, apiContext)

      // Log successful completion
      const duration = Date.now() - startTime
      logAdminOperationComplete(
        config.operation,
        config.resource,
        operationContext,
        res.statusCode || 200,
        duration,
        resourceId,
        { responseSize: JSON.stringify(res).length }
      )

    } catch (error) {
      const duration = Date.now() - startTime
      
      if (operationContext) {
        logAdminOperationError(
          config.operation,
          config.resource,
          operationContext,
          error instanceof Error ? error : String(error),
          500,
          undefined,
          { duration }
        )
      } else {
        logger.error('Admin API handler error', {
          operation: config.operation,
          resource: config.resource,
          path: req.url,
          method: req.method,
          error: error instanceof Error ? error.message : String(error),
          duration
        })
      }

      return res.status(500).json({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
}

/**
 * Extract resource ID from URL path
 */
function extractResourceId(url: string): string | undefined {
  const pathSegments = url.split('/').filter(Boolean)
  
  // Look for UUID pattern or numeric ID
  for (const segment of pathSegments) {
    if (segment.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) ||
        segment.match(/^\d+$/)) {
      return segment
    }
  }
  
  return undefined
}

/**
 * Helper to create common admin operations
 */
export const AdminOperations = {
  listCompanies: () => createAdminApiHandler({
    operation: ADMIN_OPERATIONS.LIST,
    resource: ADMIN_RESOURCES.COMPANY,
    requireSuperAdmin: true,
    allowedMethods: ['GET']
  }, {
    GET: async (req, res, context) => {
      // Implementation will be added by the specific API
      res.status(501).json({ error: 'Not implemented' })
    }
  }),

  createCompany: () => createAdminApiHandler({
    operation: ADMIN_OPERATIONS.CREATE,
    resource: ADMIN_RESOURCES.COMPANY,
    requireSuperAdmin: true,
    allowedMethods: ['POST']
  }, {
    POST: async (req, res, context) => {
      // Implementation will be added by the specific API
      res.status(501).json({ error: 'Not implemented' })
    }
  }),

  listUsers: () => createAdminApiHandler({
    operation: ADMIN_OPERATIONS.LIST,
    resource: ADMIN_RESOURCES.USER,
    requireSuperAdmin: true,
    allowedMethods: ['GET']
  }, {
    GET: async (req, res, context) => {
      // Implementation will be added by the specific API
      res.status(501).json({ error: 'Not implemented' })
    }
  }),

  createUser: () => createAdminApiHandler({
    operation: ADMIN_OPERATIONS.CREATE,
    resource: ADMIN_RESOURCES.USER,
    requireSuperAdmin: true,
    allowedMethods: ['POST']
  }, {
    POST: async (req, res, context) => {
      // Implementation will be added by the specific API
      res.status(501).json({ error: 'Not implemented' })
    }
  })
}

