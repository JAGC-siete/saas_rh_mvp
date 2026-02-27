import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const SECURITY_HEADERS: Record<string, string> = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Block /api/debug/* endpoints in production
  const isProduction = process.env.NODE_ENV === 'production'
  const isStaging = (process.env.NODE_ENV as string) === 'staging' || process.env.RAILWAY_ENVIRONMENT === 'staging'

  if (pathname.startsWith('/api/debug')) {
    if (isProduction || (isStaging && process.env.ALLOW_DEBUG_ENDPOINTS !== 'true')) {
      const res = new NextResponse(
        JSON.stringify({
          error: 'Debug endpoints disabled in this environment',
          message: 'Debug endpoints are only available in development mode'
        }),
        {
          status: 403,
          headers: {
            'content-type': 'application/json',
            'X-Debug-Disabled': 'true',
            ...SECURITY_HEADERS
          }
        }
      )
      return res
    }
  }

  const response = NextResponse.next()
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  return response
}

export const config = {
  matcher: ['/api/debug/:path*', '/api/:path*']
}
