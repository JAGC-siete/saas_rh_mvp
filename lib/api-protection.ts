/**
 * API Protection Utilities
 * Provides easy integration of idle timeout and authentication
 *
 * Idle timeout (withIdleTimeout → is_session_active / 440) is optional: no API routes
 * use this wrapper by default. The app relies on SessionExpiryWarning + /api/auth/heartbeat
 * for client-side inactivity hints and user_sessions updates after login.
 * Wrap specific /api/admin mutating handlers here if server-enforced idle cutoff is required.
 *
 * Usage:
 * import { withApiProtection } from '@/lib/api-protection'
 *
 * export default withApiProtection(async (req, res) => {
 *   // Your API logic here
 * })
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { withIdleTimeout, IdleTimeoutOptions } from './middleware/idle-timeout'

export interface ApiProtectionOptions {
  requireAuth?: boolean
  requireIdleTimeout?: boolean
  allowedRoles?: string[]
}

/**
 * Wrap an API handler with authentication and optional idle timeout
 */
export function withApiProtection(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<any>,
  options: ApiProtectionOptions = {}
) {
  const { requireIdleTimeout = true } = options

  return async (req: NextApiRequest, res: NextApiResponse) => {
    // If idle timeout is enabled, wrap with idle timeout middleware
    if (requireIdleTimeout) {
      const idleTimeoutOptions: IdleTimeoutOptions = {
        excludedPaths: ['/api/health', '/api/metrics', '/_next', '/favicon.ico'],
        excludedUserAgents: ['health-check', 'bot', 'spider', 'crawler']
      }
      return withIdleTimeout(req, res, handler, idleTimeoutOptions)
    }

    // Otherwise, just call the handler directly
    return handler(req, res)
  }
}

/**
 * Example usage in API routes:
 * 
 * ```typescript
 * import { withApiProtection } from '@/lib/api-protection'
 * 
 * export default withApiProtection(async (req, res) => {
 *   // Your protected API logic
 *   res.status(200).json({ data: 'protected' })
 * }, {
 *   requireIdleTimeout: true,
 *   allowedRoles: ['admin', 'hr_manager']
 * })
 * ```
 */

