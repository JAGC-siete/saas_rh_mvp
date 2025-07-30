import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Log all requests for debugging
  console.log(`[Middleware] ${request.method} ${pathname}`)

  // Handle API routes
  if (pathname.startsWith('/api/')) {
    console.log(`[Middleware] API route: ${pathname}`)
    
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      const response = new NextResponse(null, { status: 200 })
      response.headers.set('Access-Control-Allow-Origin', '*')
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
    console.log(`[Middleware] Public route: ${pathname}`)
    return NextResponse.next()
  }

  // For private routes, check for session
  // Note: In a real implementation, you'd check for a valid session token
  // For now, we'll allow access but the components will handle auth
  console.log(`[Middleware] Private route: ${pathname}`)
  
  return NextResponse.next()
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