import { logger } from '../logger'

// In-memory rate limiter (in production, use Redis)
interface RateLimitEntry {
  count: number
  resetTime: number
  blocked: boolean
  blockUntil?: number
}

class RateLimiter {
  private store = new Map<string, RateLimitEntry>()
  private cleanupInterval: NodeJS.Timeout

  constructor() {
    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 5 * 60 * 1000)
  }

  /**
   * Check if request should be rate limited
   * @param key - Unique identifier (IP, user ID, etc.)
   * @param windowMs - Time window in milliseconds
   * @param maxRequests - Maximum requests per window
   * @param blockDurationMs - How long to block after exceeding limit
   */
  check(
    key: string, 
    windowMs: number = 60000, // 1 minute
    maxRequests: number = 10,
    blockDurationMs: number = 15 * 60 * 1000 // 15 minutes
  ): { allowed: boolean; remainingRequests?: number; resetTime?: number; retryAfter?: number } {
    const now = Date.now()
    const entry = this.store.get(key)

    // If blocked, check if block period has expired
    if (entry?.blocked && entry.blockUntil) {
      if (now < entry.blockUntil) {
        return {
          allowed: false,
          retryAfter: Math.ceil((entry.blockUntil - now) / 1000) // seconds
        }
      } else {
        // Block period expired, reset entry
        this.store.delete(key)
      }
    }

    // Get or create entry
    const currentEntry = this.store.get(key) || {
      count: 0,
      resetTime: now + windowMs,
      blocked: false
    }

    // Reset if window has expired
    if (now >= currentEntry.resetTime) {
      currentEntry.count = 0
      currentEntry.resetTime = now + windowMs
      currentEntry.blocked = false
      delete currentEntry.blockUntil
    }

    // Increment counter
    currentEntry.count++

    // Check if limit exceeded
    if (currentEntry.count > maxRequests) {
      currentEntry.blocked = true
      currentEntry.blockUntil = now + blockDurationMs
      
      logger.warn('Rate limit exceeded', {
        key,
        count: currentEntry.count,
        maxRequests,
        blockUntil: new Date(currentEntry.blockUntil).toISOString()
      })

      this.store.set(key, currentEntry)
      
      return {
        allowed: false,
        retryAfter: Math.ceil(blockDurationMs / 1000)
      }
    }

    this.store.set(key, currentEntry)

    return {
      allowed: true,
      remainingRequests: maxRequests - currentEntry.count,
      resetTime: currentEntry.resetTime
    }
  }

  /**
   * Reset rate limit for a key (useful for successful authentications)
   */
  reset(key: string): void {
    this.store.delete(key)
  }

  /**
   * Get current rate limit status
   */
  getStatus(key: string): RateLimitEntry | null {
    return this.store.get(key) || null
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now()
    let cleaned = 0

    for (const [key, entry] of this.store.entries()) {
      // Remove if window expired and not blocked, or if block period expired
      if ((now >= entry.resetTime && !entry.blocked) || 
          (entry.blocked && entry.blockUntil && now >= entry.blockUntil)) {
        this.store.delete(key)
        cleaned++
      }
    }

    if (cleaned > 0) {
      logger.debug('Rate limiter cleanup', { entriesRemoved: cleaned })
    }
  }

  /**
   * Get statistics about the rate limiter
   */
  getStats(): { totalEntries: number; blockedEntries: number } {
    let blockedCount = 0
    
    for (const entry of this.store.values()) {
      if (entry.blocked) blockedCount++
    }

    return {
      totalEntries: this.store.size,
      blockedEntries: blockedCount
    }
  }

  /**
   * Destroy the rate limiter (cleanup interval)
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    this.store.clear()
  }
}

// Global rate limiter instance
export const rateLimiter = new RateLimiter()

// Specific rate limiters for different use cases
export const employeeAuthLimiter = {
  check: (key: string) => rateLimiter.check(
    `employee_auth:${key}`, 
    15 * 60 * 1000, // 15 minute window
    5, // 5 attempts per window
    30 * 60 * 1000 // 30 minute block
  ),
  reset: (key: string) => rateLimiter.reset(`employee_auth:${key}`)
}

export const employeeApiLimiter = {
  check: (key: string) => rateLimiter.check(
    `employee_api:${key}`,
    60 * 1000, // 1 minute window
    30, // 30 requests per minute
    5 * 60 * 1000 // 5 minute block
  ),
  reset: (key: string) => rateLimiter.reset(`employee_api:${key}`)
}

// Middleware function for Express-like APIs
export function createRateLimitMiddleware(
  limiter: typeof employeeAuthLimiter,
  keyExtractor: (req: any) => string = (req) => req.ip || 'unknown'
) {
  return (req: any, res: any, next?: () => void) => {
    const key = keyExtractor(req)
    const result = limiter.check(key)

    if (!result.allowed) {
      const error = {
        error: 'Rate limit exceeded',
        retryAfter: result.retryAfter
      }

      if (res.status) {
        // Express-like response
        return res.status(429).json(error)
      } else {
        // Next.js API response
        return { rateLimited: true, ...error }
      }
    }

    // Add rate limit headers
    if (res.setHeader) {
      if (result.remainingRequests !== undefined) {
        res.setHeader('X-RateLimit-Remaining', result.remainingRequests.toString())
      }
      if (result.resetTime !== undefined) {
        res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000).toString())
      }
    }

    if (next) next()
    return { rateLimited: false }
  }
}
