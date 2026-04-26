import { createAdminClient } from '../supabase/server'
import { logger } from '../logger'

export interface AuditLogEntry {
  userId: string
  action: string
  resource: string
  resourceId?: string
  details: Record<string, any>
  ip?: string
  userAgent?: string
  timestamp: Date
}

/**
 * Log an admin action for audit purposes
 * 
 * This function logs to:
 * 1. Application logger (structured logging)
 * 2. Database audit_logs table (if exists)
 * 
 * @param userId - ID of the user performing the action
 * @param action - Action name (e.g., 'device_provisioned', 'affiliate_approved')
 * @param resource - Resource type (e.g., 'device', 'affiliate', 'employee')
 * @param resourceId - ID of the resource being acted upon
 * @param details - Additional details about the action
 */
export async function logAdminAction(
  userId: string,
  action: string,
  resource: string,
  resourceId: string | undefined,
  details: Record<string, any> = {}
): Promise<void> {
  const timestamp = new Date()

  // Log to application logger (always)
  try {
    await logger.info('admin_action_audit', {
      userId,
      action,
      resource,
      resourceId,
      ...details,
      timestamp: timestamp.toISOString()
    })
  } catch (error) {
    console.error('Failed to log admin action to application logger:', error)
    // Continue - don't fail the request if logging fails
  }

  // Try to log to database audit_logs table (if it exists)
  try {
    const adminClient = createAdminClient()
    
    // Check if audit_logs table exists by attempting to insert
    // If table doesn't exist, this will fail gracefully
    const { error } = await adminClient
      .from('audit_logs')
      .insert({
        user_id: userId,
        action,
        resource_type: resource,
        resource_id: resourceId || null,
        details: details,
        created_at: timestamp.toISOString()
      })
      .select()
      .single()

    if (error) {
      // Table might not exist - that's okay, we still logged to application logger
      if (error.code !== '42P01') { // 42P01 = relation does not exist
        console.warn('Failed to log to audit_logs table:', error.message)
      }
    }
  } catch (error) {
    // Table doesn't exist or other error - that's okay
    // We've already logged to application logger
    console.debug('Audit log table not available, using application logger only')
  }
}

/**
 * Log a super admin action
 */
export async function logSuperAdminAction(
  userId: string,
  action: string,
  resource: string,
  resourceId: string | undefined,
  details: Record<string, any> = {}
): Promise<void> {
  await logAdminAction(userId, action, resource, resourceId, {
    ...details,
    adminLevel: 'super_admin'
  })
}

/**
 * Log a tenant-scoped admin action
 */
export async function logTenantAdminAction(
  userId: string,
  companyId: string,
  action: string,
  resource: string,
  resourceId: string | undefined,
  details: Record<string, any> = {}
): Promise<void> {
  await logAdminAction(userId, action, resource, resourceId, {
    ...details,
    companyId,
    adminLevel: 'tenant_admin'
  })
}






