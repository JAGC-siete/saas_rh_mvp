import crypto from 'crypto'
import { NextApiRequest, NextApiResponse } from 'next'
import { getTrustedClientIp } from './trusted-client-ip'

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
  },

  // Registro público de asistencia (muy restrictivo; endpoint de alto abuso)
  attendance_public: {
    windowMs: 2 * 60 * 1000, // 2 minutos
    max: 6, // 6 requests por ventana (por IP+UA)
    message: 'Demasiados registros de asistencia. Espere un momento e intente de nuevo.'
  },

  // Nómina: flujo intensivo (preview, draft, refresh tras autorizar)
  payroll: {
    windowMs: 5 * 60 * 1000, // 5 minutos
    max: 50, // máximo 50 requests por ventana (carga + cambios de período + refresh)
    message: 'Demasiadas solicitudes de nómina. Espere unos minutos.'
  },

  // Operaciones de setup (seed, inicialización) - bucket separado, más permisivo
  setup: {
    windowMs: 5 * 60 * 1000, // 5 minutos
    max: 10, // máximo 10 por ventana (bucket independiente de general)
    message: 'Demasiados intentos de inicialización. Espere unos minutos.'
  },

  /** Login B2B / empleado por IP + email (fuerza bruta por cuenta) */
  auth_login: {
    windowMs: 15 * 60 * 1000,
    max: 8,
    message: 'Demasiados intentos de inicio de sesión. Espere unos minutos.'
  },
  /** Mismo bucket pero solo por IP (muchas cuentas desde una IP) */
  auth_login_ip: {
    windowMs: 15 * 60 * 1000,
    max: 40,
    message: 'Demasiados intentos de inicio de sesión desde esta red. Espere unos minutos.'
  },
  /** Recuperación contraseña: abuso de envío de correo */
  auth_forgot_password: {
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: 'Demasiadas solicitudes de recuperación. Intente más tarde.'
  },
  auth_forgot_password_ip: {
    windowMs: 60 * 60 * 1000,
    max: 12,
    message: 'Demasiadas solicitudes de recuperación desde esta red. Intente más tarde.'
  },
  /** OTP empleado: envío */
  auth_otp_send: {
    windowMs: 15 * 60 * 1000,
    max: 3,
    message: 'Demasiados envíos de código. Intente en unos minutos.'
  },
  auth_otp_send_ip: {
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: 'Demasiados envíos de código desde esta red. Espere unos minutos.'
  },
  /** OTP empleado: verificación (adivinanza de código) */
  auth_otp_verify: {
    windowMs: 15 * 60 * 1000,
    max: 12,
    message: 'Demasiados intentos de verificación. Espere unos minutos.'
  },
  auth_otp_verify_ip: {
    windowMs: 15 * 60 * 1000,
    max: 40,
    message: 'Demasiados intentos de verificación desde esta red. Espere unos minutos.'
  }
}

// Almacén en memoria para rate limiting (en producción usar Redis)
const requestCounts = new Map<string, { count: number; resetTime: number }>()

const getClientIP = (req: NextApiRequest): string => getTrustedClientIp(req)

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

export type AuthRateLimitKind = 'auth_login' | 'auth_forgot_password' | 'auth_otp_send' | 'auth_otp_verify'

const AUTH_RATE_PRIMARY: Record<AuthRateLimitKind, keyof typeof RATE_LIMITS> = {
  auth_login: 'auth_login',
  auth_forgot_password: 'auth_forgot_password',
  auth_otp_send: 'auth_otp_send',
  auth_otp_verify: 'auth_otp_verify'
}

const AUTH_RATE_IP: Record<AuthRateLimitKind, keyof typeof RATE_LIMITS> = {
  auth_login: 'auth_login_ip',
  auth_forgot_password: 'auth_forgot_password_ip',
  auth_otp_send: 'auth_otp_send_ip',
  auth_otp_verify: 'auth_otp_verify_ip'
}

/** Normaliza email para huella (no reversible en logs sin diccionario). */
export function emailFingerprint(email: string): string {
  return crypto.createHash('sha256').update(email.trim().toLowerCase()).digest('hex').slice(0, 24)
}

function setAuthRateLimitHeaders(
  res: NextApiResponse,
  limit: { max: number; windowMs: number; message: string },
  result: { allowed: boolean; remaining: number; resetTime: number }
) {
  res.setHeader('X-RateLimit-Limit', limit.max.toString())
  res.setHeader('X-RateLimit-Remaining', Math.max(0, result.remaining).toString())
  res.setHeader('X-RateLimit-Reset', new Date(result.resetTime).toISOString())
  if (!result.allowed) {
    res.setHeader('Retry-After', Math.ceil((result.resetTime - Date.now()) / 1000).toString())
  }
}

/**
 * Rate limit por IP+email y por IP para rutas de autenticación.
 * Si `email` falta, solo aplica el bucket por IP (clave única `anonymous`).
 */
export function enforceAuthRateLimits(
  req: NextApiRequest,
  res: NextApiResponse,
  kind: AuthRateLimitKind,
  email?: string | null
): boolean {
  cleanupExpiredEntries()
  const ip = getClientIP(req)
  const emailTag =
    email && typeof email === 'string' && email.includes('@') ? emailFingerprint(email) : 'anonymous'

  const primaryLimit = RATE_LIMITS[AUTH_RATE_PRIMARY[kind]]
  const ipBucketLimit = RATE_LIMITS[AUTH_RATE_IP[kind]]

  const primaryKey = `${ip}:${kind}:${emailTag}`
  const ipOnlyKey = `${ip}:${kind}:ip`

  const primaryResult = checkRateLimit(primaryKey, primaryLimit)
  if (!primaryResult.allowed) {
    setAuthRateLimitHeaders(res, primaryLimit, primaryResult)
    res.status(429).json({
      error: 'Demasiadas solicitudes',
      message: primaryLimit.message,
      retryAfter: Math.ceil((primaryResult.resetTime - Date.now()) / 1000)
    })
    return false
  }

  const ipResult = checkRateLimit(ipOnlyKey, ipBucketLimit)
  if (!ipResult.allowed) {
    setAuthRateLimitHeaders(res, ipBucketLimit, ipResult)
    res.status(429).json({
      error: 'Demasiadas solicitudes',
      message: ipBucketLimit.message,
      retryAfter: Math.ceil((ipResult.resetTime - Date.now()) / 1000)
    })
    return false
  }

  const stricterRemaining = Math.min(primaryResult.remaining, ipResult.remaining)
  res.setHeader('X-RateLimit-Limit', String(Math.min(primaryLimit.max, ipBucketLimit.max)))
  res.setHeader('X-RateLimit-Remaining', String(Math.max(0, stricterRemaining)))
  res.setHeader(
    'X-RateLimit-Reset',
    new Date(Math.max(primaryResult.resetTime, ipResult.resetTime)).toISOString()
  )
  return true
}

// Middleware de rate limiting
export const withRateLimit = (endpointType: 'export' | 'reports' | 'general' | 'payroll' | 'setup' = 'general', allowedMethods: string[] = ['GET', 'POST', 'PUT', 'DELETE']) => {
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

// Rate limiting para registro público de asistencia
export const withAttendancePublicRateLimit = (methods?: string[]) => withRateLimit('attendance_public' as any, methods)

// Rate limiting para nómina (límite más alto por flujo intensivo)
export const withPayrollRateLimit = (methods?: string[]) => withRateLimit('payroll', methods)

// Rate limiting para operaciones de setup (seed, inicialización) - bucket independiente
export const withSetupRateLimit = (methods?: string[]) => withRateLimit('setup', methods)

// Función para verificar rate limit sin middleware
export const checkRateLimitStatus = (req: NextApiRequest, endpointType: 'export' | 'reports' | 'general' | 'payroll' | 'setup' = 'general') => {
  const clientIP = getClientIP(req)
  const userAgent = req.headers['user-agent'] || 'unknown'
  const rateLimitKey = `${clientIP}:${endpointType}:${userAgent.substring(0, 50)}`
  const limit = RATE_LIMITS[endpointType as keyof typeof RATE_LIMITS]
  if (!limit) return { allowed: true, remaining: 999, resetTime: Date.now() }

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
      else if (key.includes(':setup:')) (stats.byType as any).setup = ((stats.byType as any).setup || 0) + 1
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