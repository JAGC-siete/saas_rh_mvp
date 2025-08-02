import { NextApiRequest, NextApiResponse } from 'next'

interface RateLimitConfig {
  windowMs: number // Ventana de tiempo en milisegundos
  max: number // Máximo número de requests por ventana
  message?: string
  statusCode?: number
}

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

// Store en memoria (en producción usar Redis)
const rateLimitStore: RateLimitStore = {}

/**
 * Rate limiting middleware
 */
export function rateLimit(config: RateLimitConfig) {
  return (req: NextApiRequest, res: NextApiResponse, next: () => void) => {
    const key = getClientKey(req)
    const now = Date.now()
    
    // Limpiar entradas expiradas
    if (rateLimitStore[key] && now > rateLimitStore[key].resetTime) {
      delete rateLimitStore[key]
    }
    
    // Inicializar o incrementar contador
    if (!rateLimitStore[key]) {
      rateLimitStore[key] = {
        count: 1,
        resetTime: now + config.windowMs
      }
    } else {
      rateLimitStore[key].count++
    }
    
    // Verificar límite
    if (rateLimitStore[key].count > config.max) {
      const retryAfter = Math.ceil((rateLimitStore[key].resetTime - now) / 1000)
      
      res.setHeader('Retry-After', retryAfter.toString())
      res.setHeader('X-RateLimit-Limit', config.max.toString())
      res.setHeader('X-RateLimit-Remaining', '0')
      res.setHeader('X-RateLimit-Reset', new Date(rateLimitStore[key].resetTime).toISOString())
      
      return res.status(config.statusCode || 429).json({
        error: 'Too Many Requests',
        message: config.message || 'Demasiadas solicitudes. Intente de nuevo más tarde.',
        retryAfter
      })
    }
    
    // Agregar headers de rate limit
    res.setHeader('X-RateLimit-Limit', config.max.toString())
    res.setHeader('X-RateLimit-Remaining', (config.max - rateLimitStore[key].count).toString())
    res.setHeader('X-RateLimit-Reset', new Date(rateLimitStore[key].resetTime).toISOString())
    
    next()
  }
}

/**
 * Obtiene la clave única del cliente
 */
function getClientKey(req: NextApiRequest): string {
  // Usar IP del cliente
  const ip = req.headers['x-forwarded-for'] || 
             req.headers['x-real-ip'] || 
             req.connection.remoteAddress || 
             req.socket.remoteAddress || 
             'unknown'
  
  // Si hay usuario autenticado, incluir su ID
  const userId = (req as any).user?.id || 'anonymous'
  
  return `${ip}-${userId}`
}

/**
 * Configuraciones predefinidas de rate limiting
 */
export const RATE_LIMITS = {
  // Rate limit general para endpoints públicos
  GENERAL: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // 100 requests por 15 minutos
    message: 'Demasiadas solicitudes. Intente de nuevo en 15 minutos.'
  },
  
  // Rate limit para autenticación
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // 5 intentos de login por 15 minutos
    message: 'Demasiados intentos de inicio de sesión. Intente de nuevo en 15 minutos.',
    statusCode: 429
  },
  
  // Rate limit para registro de asistencia
  ATTENDANCE: {
    windowMs: 60 * 1000, // 1 minuto
    max: 10, // 10 registros por minuto
    message: 'Demasiados registros de asistencia. Intente de nuevo en 1 minuto.'
  },
  
  // Rate limit para cálculos de nómina
  PAYROLL: {
    windowMs: 5 * 60 * 1000, // 5 minutos
    max: 10, // 10 cálculos por 5 minutos
    message: 'Demasiados cálculos de nómina. Intente de nuevo en 5 minutos.'
  },
  
  // Rate limit para exportación de PDFs
  EXPORT: {
    windowMs: 10 * 60 * 1000, // 10 minutos
    max: 5, // 5 exportaciones por 10 minutos
    message: 'Demasiadas exportaciones. Intente de nuevo en 10 minutos.'
  }
}

/**
 * Middleware combinado de autenticación y rate limiting
 */
export function withAuthAndRateLimit(
  authPermissions: string[] = [],
  rateLimitConfig: RateLimitConfig = RATE_LIMITS.GENERAL
) {
  return (req: NextApiRequest, res: NextApiResponse, next: () => void) => {
    // Aplicar rate limiting primero
    rateLimit(rateLimitConfig)(req, res, () => {
      // Luego aplicar autenticación
      // Nota: La autenticación se debe manejar en el endpoint
      next()
    })
  }
}

/**
 * Limpia el store de rate limiting (útil para tests)
 */
export function clearRateLimitStore(): void {
  Object.keys(rateLimitStore).forEach(key => {
    delete rateLimitStore[key]
  })
} 