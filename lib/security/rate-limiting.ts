/**
 * Sistema de rate limiting simple y efectivo
 * Previene abuso de API y ataques de fuerza bruta
 */

import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '../supabase/server'

export interface RateLimitConfig {
  windowMs: number // Ventana de tiempo en ms
  maxRequests: number // Máximo de requests en la ventana
  keyGenerator?: (req: NextApiRequest) => string
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
}

export interface RateLimitInfo {
  limit: number
  remaining: number
  reset: number
  retryAfter?: number
}

// Configuraciones predefinidas
export const RATE_LIMITS = {
  // Límites generales
  GENERAL: { windowMs: 15 * 60 * 1000, maxRequests: 100 }, // 100 req/15min
  AUTH: { windowMs: 15 * 60 * 1000, maxRequests: 5 }, // 5 login/15min
  EXPORT: { windowMs: 60 * 60 * 1000, maxRequests: 10 }, // 10 exports/hour
  ATTENDANCE: { windowMs: 5 * 60 * 1000, maxRequests: 20 }, // 20 attendance/5min
  PAYROLL: { windowMs: 60 * 60 * 1000, maxRequests: 5 }, // 5 payroll/hour
  
  // Límites estrictos
  STRICT: { windowMs: 5 * 60 * 1000, maxRequests: 10 }, // 10 req/5min
  VERY_STRICT: { windowMs: 60 * 1000, maxRequests: 3 }, // 3 req/min
}

/**
 * Genera clave de rate limiting basada en IP y usuario
 */
 
export function generateRateLimitKey(req: NextApiRequest, userId?: string): string {
  const ip = getClientIP(req)
  const userAgent = req.headers['user-agent'] || 'unknown'
  
  // Si hay usuario autenticado, usar su ID
  if (userId) {
    return `user:${userId}`
  }
  
  // Si no, usar IP + User-Agent
  return `ip:${ip}:${userAgent.slice(0, 50)}`
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
 * Verifica si una request excede el rate limit
 */
export async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; info: RateLimitInfo }> {
  try {
    const supabase = createClient({} as NextApiRequest, {} as NextApiResponse)
    const now = Date.now()
    const windowStart = now - config.windowMs
    
    // Obtener requests en la ventana actual
    const { data: requests, error } = await supabase
      .from('rate_limit_requests')
      .select('timestamp')
      .eq('key', key)
      .gte('timestamp', new Date(windowStart).toISOString())
      .order('timestamp', { ascending: false })
    
    if (error) {
      console.error('Error verificando rate limit:', error)
      // En caso de error, permitir la request
      return {
        allowed: true,
        info: {
          limit: config.maxRequests,
          remaining: config.maxRequests,
          reset: now + config.windowMs
        }
      }
    }
    
    const requestCount = requests?.length || 0
    const allowed = requestCount < config.maxRequests
    const remaining = Math.max(0, config.maxRequests - requestCount)
    const reset = now + config.windowMs
    
    return {
      allowed,
      info: {
        limit: config.maxRequests,
        remaining,
        reset,
        retryAfter: allowed ? undefined : Math.ceil((reset - now) / 1000)
      }
    }
    
  } catch (error) {
    console.error('Error en checkRateLimit:', error)
    // En caso de error, permitir la request
    return {
      allowed: true,
      info: {
        limit: config.maxRequests,
        remaining: config.maxRequests,
        reset: Date.now() + config.windowMs
      }
    }
  }
}

/**
 * Registra una request en el rate limiting
 */
export async function recordRequest(
  key: string,
  req: NextApiRequest,
  success: boolean = true
): Promise<void> {
  try {
    const supabase = createClient(req, {} as NextApiResponse)
    
    await supabase
      .from('rate_limit_requests')
      .insert({
        key,
        ip_address: getClientIP(req),
        user_agent: req.headers['user-agent'],
        method: req.method,
        url: req.url,
        success,
        timestamp: new Date().toISOString()
      })
      
  } catch (error) {
    console.error('Error registrando request:', error)
  }
}

/**
 * Middleware de rate limiting
 */
export function withRateLimit(config: RateLimitConfig) {
  return (handler: Function) => {
    return async (req: NextApiRequest, res: NextApiResponse) => {
      const userId = (req as any).userProfile?.id
      const key = generateRateLimitKey(req, userId)
      
      // Verificar rate limit
      const { allowed, info } = await checkRateLimit(key, config)
      
      if (!allowed) {
        // Agregar headers de rate limit
        res.setHeader('X-RateLimit-Limit', info.limit.toString())
        res.setHeader('X-RateLimit-Remaining', info.remaining.toString())
        res.setHeader('X-RateLimit-Reset', new Date(info.reset).toISOString())
        
        if (info.retryAfter) {
          res.setHeader('Retry-After', info.retryAfter.toString())
        }
        
        return res.status(429).json({
          error: 'Demasiadas solicitudes',
          message: `Límite de ${config.maxRequests} solicitudes por ${Math.ceil(config.windowMs / 60000)} minutos excedido`,
          retryAfter: info.retryAfter
        })
      }
      
      // Agregar headers de rate limit
      res.setHeader('X-RateLimit-Limit', info.limit.toString())
      res.setHeader('X-RateLimit-Remaining', info.remaining.toString())
      res.setHeader('X-RateLimit-Reset', new Date(info.reset).toISOString())
      
      try {
        // Ejecutar handler
        const result = await handler(req, res)
        
        // Registrar request exitosa
        if (config.skipSuccessfulRequests !== true) {
          await recordRequest(key, req, true)
        }
        
        return result
        
      } catch (error) {
        // Registrar request fallida
        if (config.skipFailedRequests !== true) {
          await recordRequest(key, req, false)
        }
        
        throw error
      }
    }
  }
}

/**
 * Rate limiting específico para autenticación
 */
export function withAuthRateLimit() {
  return withRateLimit(RATE_LIMITS.AUTH)
}

/**
 * Rate limiting específico para exportaciones
 */
export function withExportRateLimit() {
  return withRateLimit(RATE_LIMITS.EXPORT)
}

/**
 * Rate limiting específico para asistencia
 */
export function withAttendanceRateLimit() {
  return withRateLimit(RATE_LIMITS.ATTENDANCE)
}

/**
 * Rate limiting específico para nómina
 */
export function withPayrollRateLimit() {
  return withRateLimit(RATE_LIMITS.PAYROLL)
}

/**
 * Rate limiting estricto para operaciones críticas
 */
export function withStrictRateLimit() {
  return withRateLimit(RATE_LIMITS.STRICT)
}

/**
 * Limpia requests antiguas del rate limiting
 */
export async function cleanupRateLimitRequests(): Promise<void> {
  try {
    const supabase = createClient({} as NextApiRequest, {} as NextApiResponse)
    const cutoffDate = new Date()
    cutoffDate.setHours(cutoffDate.getHours() - 24) // Limpiar requests de hace 24 horas
    
    const { error } = await supabase
      .from('rate_limit_requests')
      .delete()
      .lt('timestamp', cutoffDate.toISOString())
    
    if (error) {
      console.error('Error limpiando rate limit requests:', error)
    } else {
      console.log('Rate limit requests antiguas eliminadas')
    }
  } catch (error) {
    console.error('Error en cleanupRateLimitRequests:', error)
  }
}

/**
 * Obtiene estadísticas de rate limiting
 */
export async function getRateLimitStats(
  key?: string,
  hours: number = 24
): Promise<{
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  uniqueIPs: number
}> {
  try {
    const supabase = createClient({} as NextApiRequest, {} as NextApiResponse)
    const cutoffDate = new Date()
    cutoffDate.setHours(cutoffDate.getHours() - hours)
    
    let query = supabase
      .from('rate_limit_requests')
      .select('*')
      .gte('timestamp', cutoffDate.toISOString())
    
    if (key) {
      query = query.eq('key', key)
    }
    
    const { data: requests, error } = await query
    
    if (error) {
      console.error('Error obteniendo estadísticas de rate limiting:', error)
      return { totalRequests: 0, successfulRequests: 0, failedRequests: 0, uniqueIPs: 0 }
    }
    
    const totalRequests = requests?.length || 0
    const successfulRequests = requests?.filter(r => r.success).length || 0
    const failedRequests = totalRequests - successfulRequests
    const uniqueIPs = new Set(requests?.map(r => r.ip_address)).size
    
    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      uniqueIPs
    }
  } catch (error) {
    console.error('Error en getRateLimitStats:', error)
    return { totalRequests: 0, successfulRequests: 0, failedRequests: 0, uniqueIPs: 0 }
  }
}
