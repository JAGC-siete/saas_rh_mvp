import { NextApiRequest, NextApiResponse } from 'next'
import { logger } from '../../../lib/logger'

interface PinAttempt {
  count: number
  blockedUntil?: number
}

// In-memory store for rate limiting (use Redis in production)
const attempts: Map<string, PinAttempt> = new Map()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { pin } = req.body
    
    if (!pin || typeof pin !== 'string' || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      logger.warn('Invalid PIN format', { 
        pinLength: pin?.length,
        isNumeric: /^\d+$/.test(pin || '')
      })
      return res.status(400).json({ error: 'PIN debe ser de 4 dígitos numéricos' })
    }

    // Get client IP for rate limiting
    const clientIP = (req.headers['x-forwarded-for'] || req.connection.remoteAddress) as string
    const attemptKey = `pin_attempts_${clientIP}`
    
    // Check if client is blocked
    const currentAttempt = attempts.get(attemptKey) || { count: 0 }
    const now = Date.now()
    
    if (currentAttempt.blockedUntil && now < currentAttempt.blockedUntil) {
      const remainingMinutes = Math.ceil((currentAttempt.blockedUntil - now) / (1000 * 60))
      logger.warn('PIN attempt while blocked', { 
        clientIP,
        remainingMinutes,
        currentCount: currentAttempt.count
      })
      return res.status(429).json({ 
        error: `Bloqueado por ${remainingMinutes} minutos. Demasiados intentos fallidos.`,
        blockedMinutes: remainingMinutes
      })
    }

    // Environment variables
    const correctPin = process.env.DEMO_SHARED_PIN || '2741'
    const maxAttempts = parseInt(process.env.DEMO_MAX_ATTEMPTS || '6', 10)
    const blockMinutes = parseInt(process.env.DEMO_BLOCK_MIN || '15', 10)
    const cookieTTLMinutes = parseInt(process.env.DEMO_COOKIE_TTL_MIN || '60', 10)

    // Check PIN
    if (pin === correctPin) {
      // PIN correct - clear attempts and set cookie
      attempts.delete(attemptKey)
      
      logger.info('Demo PIN verified successfully', { clientIP })
      
      // Set HttpOnly cookie
      const cookieExpiry = new Date(Date.now() + cookieTTLMinutes * 60 * 1000)
      res.setHeader('Set-Cookie', `demo_ok=1; HttpOnly; Path=/; Expires=${cookieExpiry.toUTCString()}; SameSite=Strict`)
      
      return res.status(200).json({ 
        success: true,
        message: 'PIN correcto. Acceso al demo concedido.',
        expiresInMinutes: cookieTTLMinutes
      })
      
    } else {
      // PIN incorrect - increment attempts
      const newCount = currentAttempt.count + 1
      
      logger.warn('Demo PIN attempt failed', { 
        clientIP,
        attemptCount: newCount,
        maxAttempts
      })
      
      if (newCount >= maxAttempts) {
        // Block client
        const blockedUntil = now + (blockMinutes * 60 * 1000)
        attempts.set(attemptKey, { count: newCount, blockedUntil })
        
        logger.warn('Client blocked due to too many failed PIN attempts', {
          clientIP,
          blockedUntil: new Date(blockedUntil).toISOString(),
          blockMinutes
        })
        
        return res.status(429).json({ 
          error: `Bloqueado por ${blockMinutes} minutos. Demasiados intentos fallidos.`,
          blockedMinutes: blockMinutes
        })
      } else {
        // Update attempt count
        attempts.set(attemptKey, { count: newCount })
        const remainingAttempts = maxAttempts - newCount
        
        return res.status(400).json({ 
          error: 'PIN incorrecto',
          remainingAttempts,
          message: `PIN incorrecto. Te quedan ${remainingAttempts} intentos.`
        })
      }
    }
    
  } catch (error) {
    logger.error('Error in demo PIN verification', error)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}
