/**
 * Sistema de auditoría centralizado para seguridad
 * Registra acciones críticas y accesos a datos sensibles
 */

import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../supabase/server'
import { UserProfile } from '../auth-helpers'

export interface AuditEvent {
  id?: string
  user_id: string
  company_id?: string
  action: string
  resource: string
  resource_id?: string
  details: Record<string, any>
  ip_address?: string
  user_agent?: string
  timestamp: string
  severity: 'low' | 'medium' | 'high' | 'critical'
}

export interface AuditContext {
  req: NextApiRequest
  res: NextApiResponse
  userProfile?: UserProfile
  action: string
  resource: string
  resourceId?: string
  details?: Record<string, any>
  severity?: 'low' | 'medium' | 'high' | 'critical'
}

/**
 * Registra un evento de auditoría
 */
export async function logAuditEvent(event: AuditEvent): Promise<void> {
  try {
    const supabase = createClient({} as NextApiRequest, {} as NextApiResponse)
    
    const { error } = await supabase
      .from('audit_logs')
      .insert({
        user_id: event.user_id,
        company_id: event.company_id,
        action: event.action,
        resource: event.resource,
        resource_id: event.resource_id,
        details: event.details,
        ip_address: event.ip_address,
        user_agent: event.user_agent,
        timestamp: event.timestamp,
        severity: event.severity
      })

    if (error) {
      console.error('Error registrando evento de auditoría:', error)
    }
  } catch (error) {
    console.error('Error en sistema de auditoría:', error)
  }
}

/**
 * Crea un evento de auditoría desde contexto de request
 */
export function createAuditEvent(context: AuditContext): AuditEvent {
  const { req, userProfile, action, resource, resourceId, details = {}, severity = 'medium' } = context
  
  return {
    user_id: userProfile?.id || 'anonymous',
    company_id: userProfile?.company_id,
    action,
    resource,
    resource_id: resourceId,
    details: {
      ...details,
      method: req.method,
      url: req.url,
      endpoint: req.url?.split('?')[0]
    },
    ip_address: getClientIP(req),
    user_agent: req.headers['user-agent'],
    timestamp: new Date().toISOString(),
    severity
  }
}

/**
 * Obtiene la IP del cliente
 */
function getClientIP(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for']
  const realIP = req.headers['x-real-ip']
  
  if (forwarded) {
    return Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0]
  }
  
  if (realIP) {
    return Array.isArray(realIP) ? realIP[0] : realIP
  }
  
  return req.socket.remoteAddress || 'unknown'
}

/**
 * Middleware de auditoría para endpoints
 */
export function withAudit(
  action: string,
  resource: string,
  options: {
    severity?: 'low' | 'medium' | 'high' | 'critical'
    includeDetails?: boolean
    logOnSuccess?: boolean
    logOnError?: boolean
  } = {}
) {
  return (handler: Function) => {
    return async (req: NextApiRequest, res: NextApiResponse) => {
      const { 
        severity = 'medium', 
        includeDetails = true, 
        logOnSuccess = true, 
        logOnError = true 
      } = options
      
      const userProfile = (req as any).userProfile
      const startTime = Date.now()
      
      try {
        // Ejecutar handler original
        const result = await handler(req, res)
        
        // Log de éxito si está habilitado
        if (logOnSuccess) {
          const auditEvent = createAuditEvent({
            req,
            res,
            userProfile,
            action,
            resource,
            details: includeDetails ? {
              duration: Date.now() - startTime,
              status: 'success'
            } : {},
            severity
          })
          
          await logAuditEvent(auditEvent)
        }
        
        return result
        
      } catch (error) {
        // Log de error si está habilitado
        if (logOnError) {
          const auditEvent = createAuditEvent({
            req,
            res,
            userProfile,
            action,
            resource,
            details: includeDetails ? {
              duration: Date.now() - startTime,
              status: 'error',
              error: error instanceof Error ? error.message : 'Unknown error'
            } : {},
            severity: 'high'
          })
          
          await logAuditEvent(auditEvent)
        }
        
        throw error
      }
    }
  }
}

/**
 * Registra acceso a datos sensibles
 */
export async function logSensitiveAccess(
  context: AuditContext,
  dataType: string,
  recordCount: number = 1
): Promise<void> {
  const auditEvent = createAuditEvent({
    ...context,
    action: `access_${dataType}`,
    resource: dataType,
    details: {
      ...context.details,
      record_count: recordCount,
      data_type: dataType
    },
    severity: 'high'
  })
  
  await logAuditEvent(auditEvent)
}

/**
 * Registra exportación de datos
 */
export async function logDataExport(
  context: AuditContext,
  format: string,
  recordCount: number
): Promise<void> {
  const auditEvent = createAuditEvent({
    ...context,
    action: 'export_data',
    resource: 'data_export',
    details: {
      ...context.details,
      format,
      record_count: recordCount,
      export_type: context.resource
    },
    severity: 'high'
  })
  
  await logAuditEvent(auditEvent)
}

/**
 * Registra cambios en datos críticos
 */
export async function logDataModification(
  context: AuditContext,
  operation: 'create' | 'update' | 'delete',
  changes?: Record<string, any>
): Promise<void> {
  const auditEvent = createAuditEvent({
    ...context,
    action: `${operation}_${context.resource}`,
    details: {
      ...context.details,
      operation,
      changes: changes || {}
    },
    severity: 'medium'
  })
  
  await logAuditEvent(auditEvent)
}

/**
 * Registra intentos de acceso no autorizado
 */
export async function logUnauthorizedAccess(
  context: AuditContext,
  reason: string
): Promise<void> {
  const auditEvent = createAuditEvent({
    ...context,
    action: 'unauthorized_access',
    resource: 'security',
    details: {
      ...context.details,
      reason,
      attempted_action: context.action
    },
    severity: 'critical'
  })
  
  await logAuditEvent(auditEvent)
}

/**
 * Obtiene eventos de auditoría para un usuario/empresa
 */
export async function getAuditEvents(
  userId?: string,
  companyId?: string,
  limit: number = 100
): Promise<AuditEvent[]> {
  try {
    const supabase = createClient({} as NextApiRequest, {} as NextApiResponse)
    
    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit)
    
    if (userId) {
      query = query.eq('user_id', userId)
    }
    
    if (companyId) {
      query = query.eq('company_id', companyId)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('Error obteniendo eventos de auditoría:', error)
      return []
    }
    
    return data || []
  } catch (error) {
    console.error('Error en getAuditEvents:', error)
    return []
  }
}

/**
 * Limpia eventos de auditoría antiguos
 */
export async function cleanupOldAuditEvents(daysToKeep: number = 90): Promise<void> {
  try {
    const supabase = createClient({} as NextApiRequest, {} as NextApiResponse)
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)
    
    const { error } = await supabase
      .from('audit_logs')
      .delete()
      .lt('timestamp', cutoffDate.toISOString())
    
    if (error) {
      console.error('Error limpiando eventos de auditoría:', error)
    } else {
      console.log(`Eventos de auditoría anteriores a ${cutoffDate.toISOString()} eliminados`)
    }
  } catch (error) {
    console.error('Error en cleanupOldAuditEvents:', error)
  }
}
