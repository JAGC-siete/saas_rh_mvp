import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Block /api/debug/* endpoints in production
  if (pathname.startsWith('/api/debug') && process.env.NODE_ENV === 'production') {
    return new NextResponse(
      JSON.stringify({ error: 'Debug endpoints disabled in production' }),
      { status: 403, headers: { 'content-type': 'application/json' } }
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/debug/:path*'
}
