import { NextApiRequest, NextApiResponse } from 'next'

/**
 * SISTEMA DE RATE LIMITING PARA PROTEGER CONTRA ATAQUES DE FUERZA BRUTA
 * Implementa diferentes límites según el tipo de endpoint
 */

// Configuración de rate limiting por tipo de endpoint
const RATE_LIMITS = {
  // Endpoints de exportación (más restrictivos)
  export: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // máximo 5 requests por ventana
    message: 'Demasiadas exportaciones. Intente más tarde.'
  },
  
  // Endpoints de reportes (moderados)
  reports: {
    windowMs: 10 * 60 * 1000, // 10 minutos
    max: 10, // máximo 10 requests por ventana
    message: 'Demasiadas consultas de reportes. Intente más tarde.'
  },
  
  // Endpoints generales (menos restrictivos)
  general: {
    windowMs: 5 * 60 * 1000, // 5 minutos
    max: 20, // máximo 20 requests por ventana
    message: 'Demasiadas solicitudes. Intente más tarde.'
  }
}

// Almacén en memoria para rate limiting (en producción usar Redis)
const requestCounts = new Map<string, { count: number; resetTime: number }>()

// Obtener IP del cliente
const getClientIP = (req: NextApiRequest): string => {
  const forwarded = req.headers['x-forwarded-for']
  const ip = forwarded 
    ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0])
    : req.connection.remoteAddress || 'unknown'
  
  return ip.trim()
}

// Limpiar entradas expiradas del almacén
const cleanupExpiredEntries = () => {
  const now = Date.now()
  for (const [key, value] of requestCounts.entries()) {
    if (now > value.resetTime) {
      requestCounts.delete(key)
    }
  }
}

// Verificar rate limit
const checkRateLimit = (key: string, limit: { windowMs: number; max: number }): {
  allowed: boolean
  remaining: number
  resetTime: number
} => {
  const now = Date.now()
  const entry = requestCounts.get(key)
  
  if (!entry || now > entry.resetTime) {
    // Nueva ventana o primera vez
    requestCounts.set(key, {
      count: 1,
      resetTime: now + limit.windowMs
    })
    
    return {
      allowed: true,
      remaining: limit.max - 1,
      resetTime: now + limit.windowMs
    }
  }
  
  if (entry.count >= limit.max) {
    // Límite excedido
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime
    }
  }
  
  // Incrementar contador
  entry.count++
  requestCounts.set(key, entry)
  
  return {
    allowed: true,
    remaining: limit.max - entry.count,
    resetTime: entry.resetTime
  }
}

// Middleware de rate limiting
export const withRateLimit = (endpointType: 'export' | 'reports' | 'general' = 'general', allowedMethods: string[] = ['GET', 'POST', 'PUT', 'DELETE']) => {
  return (handler: any) => {
    return async (req: NextApiRequest, res: NextApiResponse) => {
      // Validar método HTTP permitido ANTES de verificar rate limit
      if (!allowedMethods.includes(req.method || '')) {
        res.setHeader('Allow', allowedMethods.join(', '))
        return res.status(405).json({ 
          error: 'Method not allowed',
          allowed: allowedMethods 
        })
      }

      // Limpiar entradas expiradas
      cleanupExpiredEntries()
      
      // Obtener IP del cliente
      const clientIP = getClientIP(req)
      const userAgent = req.headers['user-agent'] || 'unknown'
      
      // Crear clave única para el rate limiting
      const rateLimitKey = `${clientIP}:${endpointType}:${userAgent.substring(0, 50)}`
      
      // Obtener configuración de límite
      const limit = RATE_LIMITS[endpointType]
      
      // Verificar rate limit
      const rateLimitResult = checkRateLimit(rateLimitKey, limit)
      
      if (!rateLimitResult.allowed) {
        // Log del intento de rate limit
        console.warn('🚨 Rate limit excedido:', {
          ip: clientIP,
          userAgent,
          endpoint: req.url,
          endpointType,
          timestamp: new Date().toISOString()
        })
        
        // Agregar headers de rate limit
        res.setHeader('X-RateLimit-Limit', limit.max.toString())
        res.setHeader('X-RateLimit-Remaining', '0')
        res.setHeader('X-RateLimit-Reset', new Date(rateLimitResult.resetTime).toISOString())
        res.setHeader('Retry-After', Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString())
        
        return res.status(429).json({
          error: 'Demasiadas solicitudes',
          message: limit.message,
          retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000),
          timestamp: new Date().toISOString()
        })
      }
      
      // Agregar headers de rate limit exitoso
      res.setHeader('X-RateLimit-Limit', limit.max.toString())
      res.setHeader('X-RateLimit-Remaining', rateLimitResult.remaining.toString())
      res.setHeader('X-RateLimit-Reset', new Date(rateLimitResult.resetTime).toISOString())
      
      return handler(req, res)
    }
  }
}

// Rate limiting específico para exportaciones
export const withExportRateLimit = (methods?: string[]) => withRateLimit('export', methods)

// Rate limiting específico para reportes
export const withReportsRateLimit = (methods?: string[]) => withRateLimit('reports', methods)

// Rate limiting general
export const withGeneralRateLimit = (methods?: string[]) => withRateLimit('general', methods)

// Función para verificar rate limit sin middleware
export const checkRateLimitStatus = (req: NextApiRequest, endpointType: 'export' | 'reports' | 'general' = 'general') => {
  const clientIP = getClientIP(req)
  const userAgent = req.headers['user-agent'] || 'unknown'
  const rateLimitKey = `${clientIP}:${endpointType}:${userAgent.substring(0, 50)}`
  const limit = RATE_LIMITS[endpointType]
  
  return checkRateLimit(rateLimitKey, limit)
}

// Función para obtener estadísticas de rate limiting
export const getRateLimitStats = () => {
  const now = Date.now()
  const stats = {
    totalKeys: requestCounts.size,
    activeKeys: 0,
    expiredKeys: 0,
    byType: {
      export: 0,
      reports: 0,
      general: 0
    }
  }
  
  for (const [key, value] of requestCounts.entries()) {
    if (now > value.resetTime) {
      stats.expiredKeys++
    } else {
      stats.activeKeys++
      
      if (key.includes(':export:')) stats.byType.export++
      else if (key.includes(':reports:')) stats.byType.reports++
      else if (key.includes(':general:')) stats.byType.general++
    }
  }
  
  return stats
}

// Función para limpiar rate limits manualmente
export const clearRateLimits = () => {
  requestCounts.clear()
  console.log('🧹 Rate limits limpiados manualmente')
}

// Función para limpiar rate limits de una IP específica
export const clearRateLimitsForIP = (ip: string) => {
  let cleared = 0
  for (const [key] of requestCounts.entries()) {
    if (key.startsWith(ip + ':')) {
      requestCounts.delete(key)
      cleared++
    }
  }
  console.log(`🧹 Rate limits limpiados para IP ${ip}: ${cleared} entradas`)
  return cleared
}