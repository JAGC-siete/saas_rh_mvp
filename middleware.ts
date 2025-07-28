import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Log all requests for debugging
  console.log(`[Middleware] ${request.method} ${pathname}`)

  // Handle API routes
  if (pathname.startsWith('/api/')) {
    console.log(`[Middleware] API route: ${pathname}`)
    
    // Add CORS headers for API routes
    const response = NextResponse.next()
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    
    return response
  }

  // Handle authentication routes
  if (pathname.startsWith('/login') || pathname.startsWith('/dashboard')) {
    console.log(`[Middleware] Auth route: ${pathname}`)
  }

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