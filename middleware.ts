import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { logger } from './lib/logger'

// Cache public routes for better performance
const PUBLIC_ROUTES = new Set([
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
])

// Helper function to check if route is public
function isPublicRoute(pathname: string): boolean {
  // Exact match
  if (PUBLIC_ROUTES.has(pathname)) return true
  
  // Check for routes starting with public paths
  for (const route of Array.from(PUBLIC_ROUTES)) {
    if (pathname.startsWith(route + '/')) return true
  }
  
  return false
}

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

  // Check if current path is public
  if (isPublicRoute(pathname)) {
    logger.debug('Public route accessed', { path: pathname })
    const response = NextResponse.next()
    
    // Log response time
    const duration = Date.now() - startTime
    logger.api(request.method, pathname, 200, duration, { type: 'public' })
    
    return response
  }

  // For private routes, check for Supabase session
  try {
    // Create Supabase client for middleware
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      logger.error('Missing Supabase environment variables', undefined, {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey
      })
      return NextResponse.redirect(new URL('/login', request.url))
    }
    
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(_name: string, _value: string, _options: any) {
          // This will be handled by the response
        },
        remove(_name: string, _options: any) {
          // This will be handled by the response
        },
      },
    })
    
    // Get user from Supabase (more secure than getSession)
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      logger.error('Error getting user', error)
      return NextResponse.redirect(new URL('/login', request.url))
    }
    
    if (!user) {
      logger.info('No user found for private route', { path: pathname })
      return NextResponse.redirect(new URL('/login', request.url))
    }
    
    logger.debug('Valid user found', { 
      path: pathname, 
      userId: user?.id,
      email: user?.email 
    })
    
    const response = NextResponse.next()
    
    // Log successful auth
    const duration = Date.now() - startTime
    logger.api(request.method, pathname, 200, duration, { 
      type: 'authenticated',
      userId: user?.id 
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