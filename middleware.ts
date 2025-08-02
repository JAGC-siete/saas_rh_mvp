import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Log only important requests for debugging
  if (pathname.startsWith('/api/') || pathname === '/login' || pathname === '/dashboard') {
    console.log(`[Middleware] ${request.method} ${pathname}`)
  }

  // Handle API routes
  if (pathname.startsWith('/api/')) {
    console.log(`[Middleware] API route: ${pathname}`)
    
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
    '/api/attendance/lookup',
    '/api/attendance/register',
    '/api/health'
  ]

  // Check if current path is public
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  )

  // If it's a public route, allow access
  if (isPublicRoute) {
    // Only log important public routes
    if (pathname === '/login' || pathname === '/') {
      console.log(`[Middleware] Public route: ${pathname}`)
    }
    return NextResponse.next()
  }

  // For private routes, check for Supabase session
  try {
    // Create Supabase client for middleware
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('[Middleware] Missing Supabase environment variables')
      return NextResponse.redirect(new URL('/login', request.url))
    }
    
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          // This will be handled by the response
        },
        remove(name: string, options: any) {
          // This will be handled by the response
        },
      },
    })
    
    // Get session from Supabase
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('[Middleware] Error getting session:', error.message)
      return NextResponse.redirect(new URL('/login', request.url))
    }
    
    if (!session) {
      console.log(`[Middleware] No session found for private route: ${pathname}`)
      return NextResponse.redirect(new URL('/login', request.url))
    }
    
    // Only log session validation for important routes
    if (pathname === '/dashboard' || pathname === '/login') {
      console.log(`[Middleware] Valid session found for: ${pathname}`)
    }
    return NextResponse.next()
    
  } catch (error) {
    console.error(`[Middleware] Auth error: ${error.message}`)
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