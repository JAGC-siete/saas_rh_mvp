/**
 * Session Management Helper
 * Creates and manages user sessions for idle timeout tracking
 */

import { createClient } from '../supabase/server'
import { logger } from '../logger'
import type { NextApiRequest, NextApiResponse } from 'next'
import crypto from 'crypto'

/**
 * Extract JWT jti (session token) from session
 */
function extractJtiFromSession(session: any): string | null {
  try {
    // Try multiple methods to extract jti from session
    // Method 1: From access_token if it's a string
    if (session?.access_token) {
      try {
        const parts = session.access_token.split('.')
        if (parts.length >= 2) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
          if (payload.jti) return payload.jti
        }
      } catch (e) {
        // Continue to next method
      }
    }
    
    // Method 2: Already have the token ID in session
    if (session?.access_token?.substring) {
      // It's a JWT token
      try {
        const parts = session.access_token.split('.')
        if (parts.length >= 2) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
          return payload.jti || null
        }
      } catch (e) {
        // Continue
      }
    }
    
    // Method 3: Try to extract from session metadata
    if (session?.user?.user_metadata?.jti) {
      return session.user.user_metadata.jti
    }
    
    // Method 4: Generate a deterministic jti from user_id + expires_at
    if (session?.user?.id && session?.expires_at) {
      const crypto = require('crypto')
      const hash = crypto.createHash('sha256')
      hash.update(session.user.id + session.expires_at)
      return hash.digest('hex').substring(0, 32)
    }
    
    return null
  } catch (error) {
    logger.error('Failed to extract jti from session', { error, session: JSON.stringify(session).substring(0, 200) })
    return null
  }
}

/**
 * Hash identifiers for session metadata
 */
function hashIdentifier(value: string | undefined): string | null {
  if (!value) return null
  return crypto.createHash('sha256').update(value).digest('hex').substring(0, 16)
}

/**
 * Create user session in user_sessions table
 */
export async function createSessionOnLogin(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  session: any,
  companyId?: string | null
): Promise<{ success: boolean, sessionToken: string | null }> {
  try {
    const supabase = createClient(req, res)
    
    // Extract jti from JWT
    const jti = extractJtiFromSession(session)
    if (!jti) {
      logger.warn('Could not extract jti from session', { userId })
      return { success: false, sessionToken: null }
    }
    
    // Get device/user agent info
    const deviceId = req.headers['x-device-id'] as string || undefined
    const ipHash = hashIdentifier(req.headers['x-forwarded-for'] as string || req.socket.remoteAddress)
    const uaHash = hashIdentifier(req.headers['user-agent'])
    
    // Calculate expiry times
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 12 * 60 * 60 * 1000) // 12 hours
    const idleTimeoutAt = new Date(now.getTime() + 90 * 60 * 1000) // 90 minutes
    
    // Create session in database
    const { data: sessionId, error: createError } = await supabase
      .rpc('create_user_session', {
        p_user_id: userId,
        p_session_token: jti,
        p_device_id: deviceId,
        p_ip_hash: ipHash,
        p_ua_hash: uaHash,
        p_company_id: companyId || null,
        p_access_token_ttl_seconds: 12 * 60 * 60,
        p_idle_timeout_minutes: 90
      })
    
    if (createError) {
      logger.error('Failed to create user session', {
        error: createError,
        userId,
        jti
      })
      return { success: false, sessionToken: jti }
    }
    
    logger.info('User session created successfully', {
      userId,
      sessionId,
      jti: jti.substring(0, 8) + '...',
      companyId
    })
    
    return { success: true, sessionToken: jti }
    
  } catch (error) {
    logger.error('Error creating session on login', error)
    return { success: false, sessionToken: null }
  }
}

/**
 * Extract session token (jti) from cookies
 */
export function extractSessionToken(cookies: Record<string, string>): string | null {
  const authToken = cookies['sb-auth-token'] || cookies['sb-access-token']
  
  if (!authToken) return null
  
  try {
    const parsed = JSON.parse(authToken)
    return parsed.session?.access_token?.jti || parsed.jti || null
  } catch {
    try {
      // Try to extract from JWT directly
      const parts = authToken.split('.')
      if (parts.length >= 2) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
        return payload.jti || null
      }
    } catch {
      // Ignore
    }
  }
  
  return null
}

/**
 * Clear auth cookies
 */
export function clearAuthCookies(res: NextApiResponse) {
  const cookieOptions = {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 0
  }
  
  res.setHeader('Set-Cookie', [
    `sb-auth-token=; ${Object.entries(cookieOptions).map(([k, v]) => `${k}=${v}`).join('; ')}`,
    `sb-access-token=; ${Object.entries(cookieOptions).map(([k, v]) => `${k}=${v}`).join('; ')}`
  ])
}
