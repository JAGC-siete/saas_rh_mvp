/**
 * Admin API logging utilities
 * Provides consistent logging across all admin operations
 */

import { logger } from '../logger'
import { NextApiRequest, NextApiResponse } from 'next'

export interface AdminOperation {
  operation: string
  resource: string
  resourceId?: string
  userId: string
  userRole: string
  userCompany?: string
  method: string
  path: string
  statusCode: number
  duration?: number
  metadata?: Record<string, any>
  error?: Error | string
}

export interface AdminOperationContext {
  userId: string
  userRole: string
  userCompany?: string
  method: string
  path: string
}

/**
 * Log admin operations with consistent format
 */
export function logAdminOperation(
  operation: AdminOperation,
  context?: AdminOperationContext
) {
  const logData = {
    type: 'admin_operation',
    operation: operation.operation,
    resource: operation.resource,
    resourceId: operation.resourceId,
    userId: operation.userId,
    userRole: operation.userRole,
    userCompany: operation.userCompany,
    method: operation.method,
    path: operation.path,
    statusCode: operation.statusCode,
    duration: operation.duration,
    timestamp: new Date().toISOString(),
    metadata: operation.metadata,
    ...(operation.error && { error: operation.error })
  }

  // Log at appropriate level based on status code
  if (operation.statusCode >= 500) {
    logger.error('Admin operation failed', logData)
  } else if (operation.statusCode >= 400) {
    logger.warn('Admin operation error', logData)
  } else {
    logger.info('Admin operation completed', logData)
  }
}

/**
 * Log admin operation start
 */
export function logAdminOperationStart(
  operation: string,
  resource: string,
  context: AdminOperationContext,
  resourceId?: string,
  metadata?: Record<string, any>
) {
  logger.info('Admin operation started', {
    type: 'admin_operation_start',
    operation,
    resource,
    resourceId,
    userId: context.userId,
    userRole: context.userRole,
    userCompany: context.userCompany,
    method: context.method,
    path: context.path,
    timestamp: new Date().toISOString(),
    metadata
  })
}

/**
 * Log admin operation completion
 */
export function logAdminOperationComplete(
  operation: string,
  resource: string,
  context: AdminOperationContext,
  statusCode: number,
  duration: number,
  resourceId?: string,
  metadata?: Record<string, any>
) {
  logAdminOperation({
    operation,
    resource,
    resourceId,
    userId: context.userId,
    userRole: context.userRole,
    userCompany: context.userCompany,
    method: context.method,
    path: context.path,
    statusCode,
    duration,
    metadata
  })
}

/**
 * Log admin operation error
 */
export function logAdminOperationError(
  operation: string,
  resource: string,
  context: AdminOperationContext,
  error: Error | string,
  statusCode: number,
  resourceId?: string,
  metadata?: Record<string, any>
) {
  logAdminOperation({
    operation,
    resource,
    resourceId,
    userId: context.userId,
    userRole: context.userRole,
    userCompany: context.userCompany,
    method: context.method,
    path: context.path,
    statusCode,
    error,
    metadata
  })
}

/**
 * Extract context from request and user profile
 */
export function createAdminContext(
  req: NextApiRequest,
  userProfile: { id: string; role: string; company_id?: string }
): AdminOperationContext {
  return {
    userId: userProfile.id,
    userRole: userProfile.role,
    userCompany: userProfile.company_id,
    method: req.method || 'UNKNOWN',
    path: req.url || 'UNKNOWN'
  }
}

/**
 * Common admin operations
 */
export const ADMIN_OPERATIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  EXPORT: 'export',
  IMPORT: 'import',
  ACTIVATE: 'activate',
  DEACTIVATE: 'deactivate',
  INVITE: 'invite',
  REVOKE: 'revoke',
  RESET: 'reset',
  BACKUP: 'backup',
  RESTORE: 'restore'
} as const

/**
 * Common admin resources
 */
export const ADMIN_RESOURCES = {
  USER: 'user',
  COMPANY: 'company',
  EMPLOYEE: 'employee',
  DEPARTMENT: 'department',
  PAYROLL: 'payroll',
  ATTENDANCE: 'attendance',
  REPORT: 'report',
  SYSTEM: 'system',
  LOG: 'log',
  BACKUP: 'backup',
  INVITATION: 'invitation'
} as const








