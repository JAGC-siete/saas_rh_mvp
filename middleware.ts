import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { logger } from './lib/logger'

// Cache public routes for better performance
const PUBLIC_ROUTES = new Set([
  '/',                 // Landing principal (marketing)
  '/demo',             // Página de solicitud de demo - PÚBLICO
  '/activar',          // Formulario de activación - PÚBLICO
  '/gracias',          // Página de confirmación - PÚBLICO
  '/pricing',          // Página de precios - PÚBLICO
  '/features',         // Página de características - PÚBLICO
  '/about',            // Página acerca de - PÚBLICO
  '/trial-dashboard',  // Dashboard de trial - PÚBLICO
  '/trial-dashboard/*', // Dashboard de trial con parámetros - PÚBLICO
  '/politicadeprivacidad', // Política de privacidad - PÚBLICO
  '/app/login',        // Login de la aplicación
  '/app/demo/pin',     // PIN de demo - PÚBLICO
  '/app/attendance/register', // Registro de asistencia - PÚBLICO
  '/registrodeasistencia',
  '/attendance/public',
  '/attendance/register', // Legacy route - mantenida por compatibilidad
  '/api/attendance/lookup',
  '/api/attendance/register',
  '/api/attendance/first-time-check',
  '/api/attendance/update-schedule',
  '/api/activar',      // API para formulario de activación - PÚBLICO
  '/api/demo/verify-pin', // API para verificar PIN demo - PÚBLICO
  '/api/health'
])

// Static assets that should be publicly accessible
const PUBLIC_ASSETS = new Set([
  '/voucher-sample.png',  // Imagen del voucher para la landing
  '/logo-humano-sisu.png', // Logo de la empresa
  '/image-aws-solutions-architect.png', // Certificado AWS Solutions Architect
  '/image-aws-developer.png', // Certificado AWS Developer
  '/image-aws-cloud-practitioner.png', // Certificado AWS Cloud Practitioner
  '/favicon.ico',         // Favicon
  '/robots.txt',          // Robots.txt
  '/sitemap.xml'          // Sitemap
])

// App routes that require authentication (rutas internas /app/*)
const PROTECTED_APP_ROUTES = new Set([
  '/app/dashboard',
  '/app/employees',
  '/app/payroll',
  '/app/reports',
  '/app/settings',
  '/app/departments',
  '/app/leave',
  '/app/gamification',
  // Legacy attendance dashboard outside /app
  '/attendance/dashboard',
])

// API routes that require authentication and specific permissions
const PROTECTED_API_ROUTES = new Set([
  '/api/employees',
  '/api/payroll',
  '/api/reports',
  '/api/departments',
  '/api/leave',
  '/api/gamification',
])

// Helper function to check if route is protected app route
function isProtectedAppRoute(pathname: string): boolean {
  // Check exact match first
  if (PROTECTED_APP_ROUTES.has(pathname)) return true
  
  // Check for routes starting with protected app paths
  for (const route of Array.from(PROTECTED_APP_ROUTES)) {
    if (pathname.startsWith(route + '/')) return true
  }
  
  return false
}

// Helper function to check if API route is protected
function isProtectedApiRoute(pathname: string): boolean {
  // Check exact match first
  if (PROTECTED_API_ROUTES.has(pathname)) return true
  
  // Check for routes starting with protected API paths
  for (const route of Array.from(PROTECTED_API_ROUTES)) {
    if (pathname.startsWith(route + '/')) return true
  }
  
  return false
}

// Helper function to check if route is public
function isPublicRoute(pathname: string): boolean {
  // Exact match
  if (PUBLIC_ROUTES.has(pathname)) return true
  
  // Check for routes starting with public paths
  for (const route of Array.from(PUBLIC_ROUTES)) {
    if (pathname.startsWith(route + '/')) return true
  }
  
  // Check if it's a public static asset
  if (PUBLIC_ASSETS.has(pathname)) return true
  
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
    
    // 🔒 PROTECCIÓN ESPECÍFICA PARA ENDPOINTS CRÍTICOS
    if (isProtectedApiRoute(pathname)) {
      logger.debug('Protected API route accessed', { path: pathname })
      
      // Verificar autenticación básica (las APIs manejan su propia autorización)
      const authHeader = request.headers.get('authorization')
      const cookieHeader = request.headers.get('cookie')
      
      if (!authHeader && !cookieHeader) {
        logger.warn('Unauthorized API access attempt', { path: pathname, ip: request.headers.get('x-forwarded-for') || 'unknown' })
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }
      
      // Permitir que la API maneje la validación detallada
      const response = NextResponse.next()
      
      // Log response time para APIs protegidas
      const duration = Date.now() - startTime
      logger.api(request.method, pathname, 200, duration, { type: 'protected_api' })
      
      return response
    }
    
    // For other API routes, let them handle their own authentication
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

  // Handle demo routes with PIN gate
  if (pathname.startsWith('/app/demo')) {
    logger.debug('Demo route accessed', { path: pathname })
    
    // Allow PIN page (it's already in PUBLIC_ROUTES but let's be explicit)
    if (pathname === '/app/demo/pin') {
      const response = NextResponse.next()
      const duration = Date.now() - startTime
      logger.api(request.method, pathname, 200, duration, { type: 'demo_pin' })
      return response
    }
    
    // Check for demo_ok cookie
    const demoCookie = request.cookies.get('demo_ok')
    if (!demoCookie || demoCookie.value !== '1') {
      logger.debug('Demo access denied, redirecting to PIN', { path: pathname })
      const pinUrl = new URL('/app/demo/pin', request.url)
      pinUrl.searchParams.set('next', pathname)
      return NextResponse.redirect(pinUrl)
    }
    
    // Demo access granted, add X-Robots-Tag header
    const response = NextResponse.next()
    response.headers.set('X-Robots-Tag', 'noindex, nofollow')
    
    const duration = Date.now() - startTime
    logger.api(request.method, pathname, 200, duration, { type: 'demo_protected' })
    return response
  }

  // Handle demo API routes that require demo_ok cookie
  if (pathname.startsWith('/api/demo/') && pathname !== '/api/demo/verify-pin') {
    logger.debug('Demo API route accessed', { path: pathname })
    
    const demoCookie = request.cookies.get('demo_ok')
    if (!demoCookie || demoCookie.value !== '1') {
      logger.debug('Demo API access denied', { path: pathname })
      return NextResponse.json({ error: 'Demo access required' }, { status: 401 })
    }
    
    const response = NextResponse.next()
    const duration = Date.now() - startTime
    logger.api(request.method, pathname, 200, duration, { type: 'demo_api' })
    return response
  }

  // Handle protected app routes
  if (isProtectedAppRoute(pathname)) {
    logger.debug('Protected app route accessed', { path: pathname })
    
    try {
      // Create Supabase client for middleware
      const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL']
      const anon = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']
      
      if (!supabaseUrl || !anon) {
        logger.error('Missing Supabase environment variables', undefined, {
          hasUrl: !!supabaseUrl,
          hasAnon: !!anon
        })
        return NextResponse.redirect(new URL('/app/login', request.url))
      }
      
      const supabase = createServerClient(supabaseUrl, anon as string, {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set() {},
          remove() {},
        },
      })
      
      // Get user from Supabase (more secure than getSession)
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error) {
        const isMissing = (error as any)?.message?.toLowerCase?.().includes('auth session missing')
        if (isMissing) {
          logger.info('No session for protected app route', { path: pathname })
        } else {
          logger.error('Error getting user', error)
        }
        return NextResponse.redirect(new URL('/app/login', request.url))
      }
      
      if (!user) {
        logger.info('No user found for protected app route', { path: pathname })
        return NextResponse.redirect(new URL('/app/login', request.url))
      }
      
      logger.debug('Valid user found for protected app route', { 
        path: pathname, 
        userId: user?.id,
        email: user?.email 
      })
      
      const response = NextResponse.next()
      
      // Log successful auth
      const duration = Date.now() - startTime
      logger.api(request.method, pathname, 200, duration, { 
        type: 'authenticated_app',
        userId: user?.id 
      })
      
      return response
      
    } catch (error) {
      logger.error('Authentication error in protected app route', error)
      return NextResponse.redirect(new URL('/app/login', request.url))
    }
  }

  // For other private routes (legacy), check for Supabase session
  try {
    // Create Supabase client for middleware
    const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL']
    const anon = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']
    
    if (!supabaseUrl || !anon) {
      logger.error('Missing Supabase environment variables', undefined, {
      hasUrl: !!supabaseUrl,
      hasAnon: !!anon
      })
      return NextResponse.redirect(new URL('/app/login', request.url))
    }
    
    const supabase = createServerClient(supabaseUrl, anon as string, {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set() {},
        remove() {},
      },
    })
    
    // Get user from Supabase (more secure than getSession)
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      const isMissing = (error as any)?.message?.toLowerCase?.().includes('auth session missing')
      if (isMissing) {
        logger.info('No session for private route', { path: pathname })
      } else {
        logger.error('Error getting user', error)
      }
      return NextResponse.redirect(new URL('/app/login', request.url))
    }
    
    if (!user) {
      logger.info('No user found for private route', { path: pathname })
      return NextResponse.redirect(new URL('/app/login', request.url))
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
    return NextResponse.redirect(new URL('/app/login', request.url))
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