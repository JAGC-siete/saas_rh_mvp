import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { logger } from './lib/logger'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const startTime = Date.now()

  // Log all requests with structured logging
  logger.debug('Middleware request', {
    method: request.method,
    path: pathname,
    userAgent: request.headers.get('user-agent'),
    referer: request.headers.get('referer')
  })

  // Handle API routes
  if (pathname.startsWith('/api/')) {
    logger.debug('API route accessed', { path: pathname })
    
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      const response = new NextResponse(null, { status: 200 })
      response.headers.set('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_SITE_URL || 'https://humanosisu.net')
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-nextjs-data')
      response.headers.set('Access-Control-Allow-Credentials', 'true')
      return response
    }
    
    // For API routes, let them handle their own authentication
    return NextResponse.next()
  }

  // Define public routes (no authentication required)
  const publicRoutes = [
    '/',
    '/login',
    '/auth',
    '/registrodeasistencia',
    '/attendance/public',
    '/attendance/register',
    '/api/attendance/lookup',
    '/api/attendance/register',
    '/api/attendance/first-time-check',
    '/api/attendance/update-schedule',
    '/api/health'
  ]

  // Check if current path is public
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  )

  // If it's a public route, allow access
  if (isPublicRoute) {
    logger.debug('Public route accessed', { path: pathname })
    const response = NextResponse.next()
    
    // Log response time
    const duration = Date.now() - startTime
    logger.api(request.method, pathname, 200, duration, { type: 'public' })
    
    return response
  }

  // For private routes, check for authentication
  try {
    // Check for Authorization header (JWT token)
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      logger.info('No token found for private route', { path: pathname })
      return NextResponse.redirect(new URL('/login', request.url))
    }
    
    // For now, just check if token exists (frontend will handle validation)
    // In production, you would validate the JWT token here
    logger.debug('Token found for private route', { 
      path: pathname,
      hasToken: !!token 
    })
    
    const response = NextResponse.next()
    
    // Log successful auth
    const duration = Date.now() - startTime
    logger.api(request.method, pathname, 200, duration, { 
      type: 'authenticated',
      hasToken: true 
    })
    
    return response
    
  } catch (error) {
    logger.error('Authentication error in middleware', error)
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}