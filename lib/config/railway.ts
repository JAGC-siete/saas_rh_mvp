/**
 * Railway Configuration
 * Based on Railway limitations: no sticky sessions, proxy terminates TLS
 * 
 * References:
 * - https://station.railway.com/feedback/sticky-sessions-fa65efc4
 * - https://expressjs.com/en/guide/behind-proxies.html
 */

/**
 * Configure Express trust proxy for Railway
 * Railway terminates TLS and proxies requests with X-Forwarded-* headers
 * 
 * Without this, cookies with Secure flag may not work properly
 */
export function configureExpressProxy(app: any) {
  // Trust all proxies (Railway edge terminates TLS)
  app.set('trust proxy', true)
  
  // Alternative: Trust specific proxies only
  // app.set('trust proxy', ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16'])
  
  return app
}

/**
 * Configure Next.js API routes for proxy awareness
 * Ensures secure cookies work behind Railway's reverse proxy
 */
export function getCookieOptionsForRailway(): {
  secure: boolean
  sameSite: 'lax' | 'strict' | 'none'
  httpOnly: boolean
  domain?: string
} {
  const isProduction = process.env.NODE_ENV === 'production'
  const isHttps = process.env.VERCEL || process.env.RAILWAY_ENVIRONMENT
  
  return {
    secure: isProduction && isHttps ? true : false,
    sameSite: 'lax', // Change to 'none' if using subdomain auth
    httpOnly: true,
    // Don't set domain - let browser decide
  }
}

/**
 * Get client IP from request (respects X-Forwarded-For)
 * Based on: https://station.railway.com/questions/edge-proxy-x-forwarded-for-c5a50049
 * 
 * Note: Railway warns that X-Forwarded-For may not be trustworthy for security
 */
export function getClientIp(req: any): string {
  // Trust proxy is set, so X-Forwarded-For is respected
  const forwarded = req.headers['x-forwarded-for']
  
  if (forwarded) {
    // Take first IP (original client)
    const ips = forwarded.split(',')
    return ips[0].trim()
  }
  
  return req.connection?.remoteAddress || 
         req.socket?.remoteAddress || 
         'unknown'
}

/**
 * Detect if running on Railway
 */
export function isRailway(): boolean {
  return !!process.env.RAILWAY_ENVIRONMENT || !!process.env.RAILWAY_PROJECT_ID
}

/**
 * Get Railway-specific configuration
 */
export function getRailwayConfig() {
  return {
    isRailway: isRailway(),
    trustProxy: true,
    noStickySessions: true, // Railway doesn't support sticky sessions
    redisRequired: true, // Session state must be in Redis/DB, not memory
    ipHeader: 'x-forwarded-for',
    protoHeader: 'x-forwarded-proto'
  }
}

