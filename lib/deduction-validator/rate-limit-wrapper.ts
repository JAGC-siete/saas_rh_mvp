/**
 * Wrapper de rate limiting para Next.js API routes
 */

import { NextApiRequest, NextApiResponse } from 'next'
import { RATE_LIMITS, RateLimitConfig } from '../rate-limit'
import { logger } from '../logger'
import { nowInHonduras } from '../timezone'

// Store en memoria para rate limiting (en producción usar Redis)
const rateLimitStore: { [key: string]: { count: number; resetTime: number } } = {}

/**
 * Obtener IP del cliente
 */
function getClientIP(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for']
  const ip = forwarded 
    ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0])
    : req.headers['x-real-ip'] || 
      req.connection.remoteAddress || 
      req.socket.remoteAddress || 
      'unknown'
  
  return (ip as string).trim()
}

/**
 * Limpiar entradas expiradas del store
 */
function cleanupExpiredEntries() {
  const now = nowInHonduras().getTime()
  Object.keys(rateLimitStore).forEach(key => {
    if (rateLimitStore[key].resetTime < now) {
      delete rateLimitStore[key]
    }
  })
}

/**
 * Verificar rate limit
 */
function checkRateLimit(key: string, config: RateLimitConfig): { allowed: boolean; retryAfter?: number } {
  cleanupExpiredEntries()
  
  const now = nowInHonduras().getTime()
  const entry = rateLimitStore[key]

  if (!entry) {
    rateLimitStore[key] = {
      count: 1,
      resetTime: now + config.windowMs
    }
    return { allowed: true }
  }

  // Si la ventana expiró, resetear
  if (now > entry.resetTime) {
    rateLimitStore[key] = {
      count: 1,
      resetTime: now + config.windowMs
    }
    return { allowed: true }
  }

  // Incrementar contador
  entry.count++

  if (entry.count > config.max) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000)
    return { allowed: false, retryAfter }
  }

  return { allowed: true }
}

/**
 * Wrapper para aplicar rate limiting a handlers de Next.js API
 */
export function withRateLimit(
  config = RATE_LIMITS.PUBLIC_CALCULATOR,
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<any> | any
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const clientIP = getClientIP(req)
    const userAgent = (req.headers['user-agent'] || 'unknown').substring(0, 50)
    const rateLimitKey = `${clientIP}:${req.url}:${userAgent}`

    // Verificar rate limit
    const rateLimitResult = checkRateLimit(rateLimitKey, config)

    if (!rateLimitResult.allowed) {
      const retryAfter = rateLimitResult.retryAfter || 300
      
      logger.warn('Rate limit exceeded', {
        path: req.url,
        ip: clientIP,
        key: rateLimitKey
      })

      res.setHeader('Retry-After', retryAfter.toString())
      res.setHeader('X-RateLimit-Limit', config.max.toString())
      res.setHeader('X-RateLimit-Remaining', '0')
      
      const resetTime = rateLimitStore[rateLimitKey]?.resetTime
      if (resetTime) {
        res.setHeader('X-RateLimit-Reset', new Date(resetTime).toISOString())
      }

      return res.status(config.statusCode || 429).json({
        error: 'Too Many Requests',
        message: config.message || 'Demasiadas solicitudes. Intente de nuevo más tarde.',
        retryAfter
      })
    }

    // Agregar headers de rate limit
    const entry = rateLimitStore[rateLimitKey]
    if (entry) {
      res.setHeader('X-RateLimit-Limit', config.max.toString())
      res.setHeader('X-RateLimit-Remaining', Math.max(0, config.max - entry.count).toString())
      res.setHeader('X-RateLimit-Reset', new Date(entry.resetTime).toISOString())
    }

    // Si pasó el rate limit, ejecutar el handler
    try {
      return await handler(req, res)
    } catch (error: any) {
      logger.error('Error en handler después de rate limit', {
        error: error.message,
        path: req.url,
        ip: clientIP
      })
      if (!res.headersSent) {
        return res.status(500).json({
          error: 'Error interno del servidor'
        })
      }
    }
  }
}

