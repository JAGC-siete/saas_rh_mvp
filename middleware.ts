import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Block /api/debug/* endpoints in production
  // También bloquear en staging si se requiere
  const isProduction = process.env.NODE_ENV === 'production'
  const isStaging = process.env.NODE_ENV === 'staging' || process.env.RAILWAY_ENVIRONMENT === 'staging'
  
  if (pathname.startsWith('/api/debug')) {
    // Bloquear en producción y opcionalmente en staging
    if (isProduction || (isStaging && process.env.ALLOW_DEBUG_ENDPOINTS !== 'true')) {
      return new NextResponse(
        JSON.stringify({ 
          error: 'Debug endpoints disabled in this environment',
          message: 'Debug endpoints are only available in development mode'
        }),
        { 
          status: 403, 
          headers: { 
            'content-type': 'application/json',
            'X-Debug-Disabled': 'true'
          } 
        }
      )
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/debug/:path*'
}
