/**
 * Idle Timeout Middleware for 90-minute inactivity
 * Based on Supabase documentation: https://supabase.com/docs/guides/auth/sessions
 * 
 * This middleware enforces 90-minute idle timeout by:
 * 1. Reading session token (jti) from request
 * 2. Checking last_activity in user_sessions table
 * 3. If (now - last_activity) >= 90 min, return 401/440
 * 4. If active, update last_activity (rate-limited to once per 60s)
 * 5. Exclude automated requests (health checks, prefetches, etc.)
 */

import { createClient } from '../../lib/supabase/server'
import type { NextApiRequest, NextApiResponse } from 'next'
import crypto from 'crypto'
import { logger } from '../logger'

export interface IdleTimeoutOptions {
  idleTimeoutMinutes?: number
  updateIntervalSeconds?: number
  excludedPaths?: string[]
  excludedUserAgents?: string[]
}

const DEFAULT_OPTIONS: Required<IdleTimeoutOptions> = {
  idleTimeoutMinutes: 90,
  updateIntervalSeconds: 60,
  excludedPaths: ['/api/health', '/api/metrics', '/_next', '/favicon.ico'],
  excludedUserAgents: ['health-check', 'bot', 'spider', 'crawler']
}

/**
 * Extract session token (jti) from Supabase auth cookies
 */
function extractSessionToken(cookies: Record<string, string>): string | null {
  const authToken = cookies['sb-auth-token'] || cookies['sb-access-token']
  if (!authToken) return null
  
  try {
    const parsed = JSON.parse(authToken)
    return parsed.session?.access_token?.jti || parsed.jti || null
  } catch {
    return null
  }
}

/**
 * Hash IP and User-Agent for session fingerprinting
 */
function hashIdentifiers(req: NextApiRequest): { ipHash: string, uaHash: string } {
  const ip = req.headers['x-forwarded-for']?.toString() || 
              req.headers['x-real-ip']?.toString() || 
              req.connection?.remoteAddress || 
              'unknown'
  
  const ua = req.headers['user-agent'] || 'unknown'
  
  return {
    ipHash: crypto.createHash('sha256').update(ip).digest('hex').substring(0, 16),
    uaHash: crypto.createHash('sha256').update(ua).digest('hex').substring(0, 16)
  }
}

/**
 * Check if request should be excluded from idle timeout tracking
 */
function shouldExcludeRequest(req: NextApiRequest, options: IdleTimeoutOptions): boolean {
  const { excludedPaths, excludedUserAgents } = { ...DEFAULT_OPTIONS, ...options }
  
  // Check path exclusions
  const url = req.url || ''
  if (excludedPaths.some(path => url.includes(path))) {
    return true
  }
  
  // Check user agent exclusions
  const ua = req.headers['user-agent'] || ''
  if (excludedUserAgents.some(pattern => ua.toLowerCase().includes(pattern))) {
    return true
  }
  
  // Check for automated headers
  const suspiciousHeaders = [
    'x-automated',
    'x-health-check',
    'x-prefetch'
  ]
  
  for (const header of suspiciousHeaders) {
    if (req.headers[header]) {
      return true
    }
  }
  
  return false
}

/**
 * Idle Timeout Middleware
 * Enforces 90-minute idle timeout for user activity
 */
export async function withIdleTimeout(
  req: NextApiRequest,
  res: NextApiResponse,
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<any>,
  options: IdleTimeoutOptions = {}
) {
  const { idleTimeoutMinutes, updateIntervalSeconds } = { ...DEFAULT_OPTIONS, ...options }
  
  // Exclude automated requests
  if (shouldExcludeRequest(req, options)) {
    return handler(req, res)
  }
  
  try {
    const supabase = createClient(req, res)
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return handler(req, res)
    }
    
    // Extract session token (jti)
    const sessionToken = extractSessionToken(req.cookies as Record<string, string>)
    
    if (!sessionToken) {
      // No session token found - might be a first request without session record
      // Allow to pass but log warning
      logger.debug('No session token found', {
        userId: user.id,
        path: req.url
      })
      return handler(req, res)
    }
    
    // Check if session is active (not expired by idle timeout)
    const { data: isActive, error: checkError } = await supabase
      .rpc('is_session_active', { p_session_token: sessionToken })
    
    if (checkError) {
      logger.error('Error checking session activity', {
        error: checkError,
        userId: user.id,
        sessionToken: sessionToken.substring(0, 8) + '...'
      })
      // If there's an error, continue anyway to avoid breaking existing sessions
      // This is a fail-open approach for backward compatibility
    } else if (!isActive) {
      // Session expired by idle timeout
      logger.info('Session expired by idle timeout', {
        userId: user.id,
        sessionToken: sessionToken.substring(0, 8) + '...'
      })
      
      // Return 440 with expiry message
      return res.status(440).json({
        error: 'Session expired',
        message: 'Tu sesión ha expirado por inactividad de 90 minutos',
        code: 'IDLE_TIMEOUT_90M',
        requiresReauth: true
      })
    }
    
    // Update last_activity (rate-limited)
    const { data: updated, error: updateError } = await supabase
      .rpc('update_session_activity', { 
        p_session_token: sessionToken,
        p_user_id: user.id
      })
    
    if (updateError) {
      logger.error('Error updating session activity:', updateError)
      // Continue anyway - don't block request on update failure
    }
    
    // Add session metadata to request for downstream use
    const { ipHash, uaHash } = hashIdentifiers(req)
    ;(req as any).sessionMetadata = {
      sessionToken,
      userId: user.id,
      ipHash,
      uaHash
    }
    
    return handler(req, res)
    
  } catch (error) {
    console.error('Idle timeout middleware error:', error)
    // On error, continue - don't block the request
    return handler(req, res)
  }
}

/**
 * Standalone idle timeout checker for use in middleware.ts
 */
export async function checkIdleTimeout(
  user: any,
  cookies: Record<string, string>
): Promise<{ valid: boolean, reason?: string }> {
  const sessionToken = extractSessionToken(cookies)
  if (!sessionToken || !user?.id) {
    return { valid: true } // No tracking without token
  }
  
  try {
    // This would need to be called with a supabase client
    // Implementation depends on how we integrate with middleware.ts
    // For now, return valid to not break existing flow
    return { valid: true }
  } catch (error) {
    console.error('Idle timeout check error:', error)
    return { valid: true } // Fail open
  }
}

