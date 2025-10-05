import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { logger } from './lib/logger'

// Inline role validation for middleware compatibility
function validateUserPermissionsInline(profile: any, pathname: string) {
  // Super admin only endpoints
  const superAdminOnlyPaths = [
    '/api/admin/users',
    '/api/admin/companies',
    '/api/admin/companies-improved',
    '/api/admin/stats',
    '/api/admin/recent-activity'
  ]
  
  // Check if path requires super admin only
  const isSuperAdminOnly = superAdminOnlyPaths.some(path => pathname.startsWith(path))
  
  if (isSuperAdminOnly) {
    return {
      hasAccess: profile.role === 'super_admin',
      requiredRoles: ['super_admin'],
      reason: profile.role !== 'super_admin' ? 'Super admin access required' : undefined
    }
  }
  
  // Admin endpoints (super_admin, company_admin, hr_manager)
  const adminRoles = ['super_admin', 'company_admin', 'hr_manager']
  const hasAdminAccess = adminRoles.includes(profile.role)
  
  return {
    hasAccess: hasAdminAccess,
    requiredRoles: adminRoles,
    reason: !hasAdminAccess ? 'Admin access required' : undefined
  }
}

// Cache public routes for better performance
const PUBLIC_ROUTES = new Set([
  '/',                 // Landing principal (marketing)
  '/auth/start',       // Página de inicio de autenticación - PÚBLICO
  '/auth/callback',    // OAuth callback - PÚBLICO
  '/auth/confirm',     // Magic Link confirmation - PÚBLICO
  '/onboarding',       // Página de onboarding post-auth - PÚBLICO
  '/app/login',        // Login con password - PÚBLICO
  '/register',         // Redirigir a /auth/start - PÚBLICO (legacy)
  '/login',            // Redirigir a /auth/start - PÚBLICO (legacy)
  '/demo',             // Página de solicitud de demo - PÚBLICO
  '/activar',          // Formulario de activación - PÚBLICO
  '/gracias',          // Página de confirmación - PÚBLICO
  '/pricing',          // Página de precios - PÚBLICO
  '/features',         // Página de características - PÚBLICO
  '/about',            // Página acerca de - PÚBLICO
  '/trial-dashboard',  // Dashboard de trial - PÚBLICO
  '/trial-dashboard/*', // Dashboard de trial con parámetros - PÚBLICO
  '/trial',            // Todas las rutas del trial - PÚBLICO
  '/trial/*',          // Subrutas del trial - PÚBLICO
  '/trial/attendance', // Asistencia del trial - PÚBLICO
  '/trial/payroll',    // Nómina del trial - PÚBLICO
  '/trial/gamification', // Gamificación del trial - PÚBLICO
  '/auth/auth-code-error', // OAuth error page - PÚBLICO
  '/politicadeprivacidad', // Política de privacidad - PÚBLICO
  '/test-client-env',      // Debug environment variables - PÚBLICO
  '/debug-env',            // Debug environment page - PÚBLICO
  '/railway-debug',        // Railway environment debug - PÚBLICO
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
  '/api/trial',        // Todas las APIs del trial - PÚBLICO
  '/api/trial/*',      // Sub-APIs del trial - PÚBLICO
  '/api/health',
  '/api/env',          // Environment variables endpoint - PÚBLICO
  '/api/cron/*',       // Cron jobs para mantenimiento del sistema
  '/api/employees/auth/login',      // Employee portal login - PÚBLICO
  '/api/employees/auth/send-otp',   // Send OTP code - PÚBLICO
  '/api/employees/auth/verify-otp', // Verify OTP code - PÚBLICO
  '/api/employees/auth/logout',     // Employee portal logout - PÚBLICO
  '/api/employees/invitations/accept', // Accept invitation - PÚBLICO
  '/api/employees/invitations/validate', // Validate invitation - PÚBLICO
  '/employees/portal',              // Employee portal page - PÚBLICO
  '/employees/invitation',          // Employee invitation page - PÚBLICO
  '/api/employees/debug-session',    // Employee debug endpoint - PÚBLICO
  '/api/debug/payroll-run',           // Payroll debug endpoint - PÚBLICO
  '/api/debug/test-line-insert',      // Test line insert endpoint - PÚBLICO
  '/api/debug/simple-test',           // Simple debug test endpoint - PÚBLICO
  '/api/debug/auth-status',           // Auth status debug endpoint - PÚBLICO
  '/api/debug/attendance-data',       // Debug attendance data endpoint - PÚBLICO
  '/api/employees/debug-attendance'   // Employee debug attendance endpoint - PÚBLICO
])

// Static assets that should be publicly accessible
const PUBLIC_ASSETS = new Set([
  '/voucher-sample.png',  // Imagen del voucher para la landing
  '/logo-humano-sisu.png', // Logo de la empresa
  '/image-aws-solutions-architect.png', // Certificado AWS Solutions Architect
  '/image-aws-developer.png', // Certificado AWS Developer
  '/image-aws-cloud-practitioner.png', // Certificado AWS Cloud Practitioner
  '/icons/aws-solutions-architect.svg', // Icono SVG AWS Solutions Architect
  '/icons/aws-developer.svg', // Icono SVG AWS Developer
  '/icons/aws-cloud-practitioner.svg', // Icono SVG AWS Cloud Practitioner
  '/1.png', // Nueva imagen del carrusel - Vista 1
  '/2.png', // Nueva imagen del carrusel - Vista 2
  '/3.png', // Nueva imagen del carrusel - Vista 3
  '/4.png', // Nueva imagen del carrusel - Vista 4
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
  '/app/admin',           // Panel de administración
  '/app/admin/*',         // Subrutas de administración
  '/app/profile',         // Perfil del usuario
  '/app/notifications',   // Notificaciones
  // Legacy attendance dashboard outside /app
  '/attendance/dashboard',
])

// API routes that require authentication and specific permissions
const PROTECTED_API_ROUTES = new Set([
  '/api/employees',
  '/api/employees/[id]',           // Specific employee endpoints
  '/api/employees/create',         // Create employee
  '/api/employees/update',         // Update employee
  '/api/employees/search',         // Search employees
  '/api/employees/list',           // List employees
  '/api/employees/dashboard',      // Employee dashboard
  '/api/employees/me',             // Employee profile
  '/api/payroll',
  '/api/payroll/*',
  '/api/reports',
  '/api/reports/*',
  '/api/departments',
  '/api/departments/*',
  '/api/attendance/*',
  '/api/leave',
  '/api/leave/*',
  '/api/gamification',
  '/api/gamification/*',
  '/api/admin',           
  '/api/admin/*',         
  '/api/profile',         
  '/api/notifications',   
]);

// Admin-only routes that require elevated permissions
const ADMIN_ONLY_ROUTES = new Set([
  '/app/admin',
  '/app/admin/*',
  '/api/admin',
  '/api/admin/*'
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
  // PRIORITY 1: Check if route is explicitly public first (exact match)
  if (PUBLIC_ROUTES.has(pathname)) return false
  
  // PRIORITY 2: Check for public routes with wildcards
  for (const publicRoute of Array.from(PUBLIC_ROUTES)) {
    if (publicRoute.endsWith('/*') && pathname.startsWith(publicRoute.slice(0, -2))) {
      return false
    }
  }
  
  // PRIORITY 3: Check exact match for protected routes
  if (PROTECTED_API_ROUTES.has(pathname)) return true
  
  // PRIORITY 4: Check for routes starting with protected API paths (but not wildcards)
  for (const route of Array.from(PROTECTED_API_ROUTES)) {
    // Skip wildcard routes as they're handled above
    if (route.endsWith('/*')) continue
    
    // Check if pathname starts with this route followed by a slash
    if (pathname.startsWith(route + '/')) {
      return true
    }
  }
  
  return false
}

// Helper function to check if route requires admin privileges
function isAdminRoute(pathname: string): boolean {
  // Check exact match first
  if (ADMIN_ONLY_ROUTES.has(pathname)) return true
  
  // Check for routes starting with admin paths
  for (const route of Array.from(ADMIN_ONLY_ROUTES)) {
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

  // Handle legacy route redirections
  if (pathname === '/register') {
    logger.info('Redirecting legacy /register to /auth/start', { path: pathname })
    return NextResponse.redirect(new URL('/auth/start', request.url))
  }
  
  if (pathname === '/login') {
    logger.info('Redirecting legacy /login to /app/login', { path: pathname })
    return NextResponse.redirect(new URL('/app/login', request.url))
  }

  // Log all requests with structured logging
  logger.debug('Middleware request', {
    method: request.method,
    path: pathname,
    userAgent: request.headers.get('user-agent'),
    referer: request.headers.get('referer'),
    ip: request.headers.get('x-forwarded-for') || 'unknown'
  })

  // Handle API routes
  if (pathname.startsWith('/api/')) {
    logger.debug('API route accessed', { 
      path: pathname,
      isPublic: PUBLIC_ROUTES.has(pathname),
      isProtected: isProtectedApiRoute(pathname)
    })
    
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      const response = new NextResponse(null, { status: 200 })
      response.headers.set('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_SITE_URL || process.env.RAILWAY_PUBLIC_DOMAIN || '*')
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-nextjs-data')
      response.headers.set('Access-Control-Allow-Credentials', 'true')
      return response
    }
    
    // Special handling for invitation routes
    if (pathname.includes('/invitations/')) {
      logger.debug('Invitation route accessed', { 
        path: pathname,
        isPublic: PUBLIC_ROUTES.has(pathname),
        isProtected: isProtectedApiRoute(pathname)
      })
    }
    
    // 🔒 PROTECCIÓN ESPECÍFICA PARA ENDPOINTS CRÍTICOS
    if (isProtectedApiRoute(pathname)) {
      logger.debug('Protected API route accessed', { path: pathname });
      
      try {
        // Create Supabase client
        const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'];
        const anon = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];
        
        if (!supabaseUrl || !anon) {
          logger.error('Missing Supabase environment variables');
          return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }
        
        const supabase = createServerClient(supabaseUrl, anon, {
          cookies: {
            get(name: string) {
              return request.cookies.get(name)?.value;
            },
          },
        });
        
         // Check for employee token first (for employee APIs)
         const accessToken = request.cookies.get('sb-access-token')?.value
         
         if (accessToken && accessToken.startsWith('emp_')) {
           // Employee API access - let the API handle validation
           logger.debug('Employee API access detected', { path: pathname })
           const response = NextResponse.next();
           const duration = Date.now() - startTime;
           logger.api(request.method, pathname, 200, duration, { type: 'employee_api' });
           return response;
         }
         
         // For admin APIs, use Supabase Auth
         const { data: { user }, error } = await supabase.auth.getUser();
         
         if (error || !user) {
           logger.warn('Unauthorized API access attempt', { path: pathname });
           return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
         }
        
        // If admin route, check role using centralized validation
        if (isAdminRoute(pathname)) {
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('role, company_id, is_active')
            .eq('id', user.id)
            .single();
          
          if (profileError || !profile) {
            logger.warn('User profile not found for admin API access', { 
              path: pathname, 
              userId: user.id,
              error: profileError?.message
            });
            return NextResponse.json({ error: 'User profile not found' }, { status: 403 });
          }
          
          // Use simplified role validation (inline for middleware compatibility)
          const validation = validateUserPermissionsInline(profile, pathname);
          
          if (!validation.hasAccess) {
            logger.warn('Unauthorized admin API access', { 
              path: pathname, 
              userId: user.id,
              userRole: profile.role,
              userCompany: profile.company_id,
              requiredRoles: validation.requiredRoles,
              reason: validation.reason
            });
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
          }
          
          // Log successful admin access
          logger.info('Admin API access granted', {
            path: pathname,
            userId: user.id,
            userRole: profile.role,
            requiredRoles: validation.requiredRoles
          });
        }
        
        // Valid, proceed
        const response = NextResponse.next();
        const duration = Date.now() - startTime;
        logger.api(request.method, pathname, 200, duration, { type: 'protected_api' });
        return response;
        
      } catch (error) {
        logger.error('Authentication error in protected API', error);
        return NextResponse.json({ error: 'Authentication error' }, { status: 401 });
      }
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
      // Create Supabase client for middleware using proper SSR pattern
      const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL']
      const anon = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']
      
      if (!supabaseUrl || !anon) {
        logger.error('Missing Supabase environment variables', undefined, {
          hasUrl: !!supabaseUrl,
          hasAnon: !!anon
        })
        return NextResponse.redirect(new URL('/app/login', request.url))
      }
      
      const response = NextResponse.next()
      
      const supabase = createServerClient(supabaseUrl, anon as string, {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            response.cookies.set(name, value, options)
          },
          remove(name: string, options: any) {
            response.cookies.set(name, '', { ...options, maxAge: 0 })
          },
        },
      })
      
      // Debug cookies
      const cookieNames = Object.keys(request.cookies.getAll())
      const authCookies = cookieNames.filter(name => name.includes('sb-') && name.includes('auth-token'))
      logger.info('Middleware debug', { 
        path: pathname, 
        cookieNames, 
        authCookies,
        hasAuthCookie: authCookies.length > 0,
        cookieValues: authCookies.map(name => ({
          name,
          hasValue: !!request.cookies.get(name)?.value,
          valueLength: request.cookies.get(name)?.value?.length || 0
        }))
      })
      
      // SECURITY FIX: Use getUser() instead of getSession() for authentication
      const { data: { user }, error } = await supabase.auth.getUser()
      
      logger.info('User debug', {
        path: pathname,
        hasUser: !!user,
        userId: user?.id,
        error: error?.message
      })
      
      if (error) {
        logger.error('Error getting user', error)
        return NextResponse.redirect(new URL('/app/login', request.url))
      }
      
      if (!user) {
        logger.info('No user found for protected app route', { path: pathname })
        return NextResponse.redirect(new URL('/app/login', request.url))
      }

      // Check admin privileges for admin routes
      if (isAdminRoute(pathname)) {
        logger.debug('Admin route accessed, checking privileges', { 
          path: pathname, 
          userId: user?.id 
        })
        
        // Get user profile to check role
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        
        // Super admin route requires super_admin role only
        const requiredRole = pathname === '/app/admin/super-admin' ? 'super_admin' : ['super_admin', 'company_admin', 'hr_manager']
        const hasPermission = pathname === '/app/admin/super-admin' 
          ? profile?.role === 'super_admin'
          : profile ? ['super_admin', 'company_admin', 'hr_manager'].includes(profile.role) : false
          
        if (profileError || !profile || !hasPermission) {
          logger.warn('Unauthorized admin access attempt', { 
            path: pathname, 
            userId: user?.id,
            userRole: profile?.role,
            requiredRole: pathname === '/app/admin/super-admin' ? 'super_admin only' : 'admin roles'
          })
          return NextResponse.redirect(new URL('/app/dashboard', request.url))
        }
        
        logger.debug('Admin access granted', { 
          path: pathname, 
          userId: user?.id,
          userRole: profile.role 
        })
      }

      // Employee portal uses standard Supabase Auth now
      // No special handling needed - it will be processed like any other protected route
      
      logger.debug('Valid user found for protected app route', { 
        path: pathname, 
        userId: user?.id,
        email: user?.email 
      })
      
      // Log successful auth
      const duration = Date.now() - startTime
      logger.api(request.method, pathname, 200, duration, { 
        type: 'authenticated_app',
        userId: user?.id 
      })
      
      return response
      
    } catch (error) {
      logger.error('Authentication error in protected app route', error)
      return NextResponse.redirect(new URL('/auth/start', request.url))
    }
  }

  // For other private routes (legacy), check for Supabase session
  try {
    // Create Supabase client for middleware using proper SSR pattern
    const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL']
    const anon = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']
    
    if (!supabaseUrl || !anon) {
      logger.error('Missing Supabase environment variables', undefined, {
        hasUrl: !!supabaseUrl,
        hasAnon: !!anon
      })
      return NextResponse.redirect(new URL('/auth/start', request.url))
    }
    
    const response = NextResponse.next()
    
    const supabase = createServerClient(supabaseUrl, anon as string, {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          response.cookies.set(name, value, options)
        },
        remove(name: string, options: any) {
          response.cookies.set(name, '', { ...options, maxAge: 0 })
        },
      },
    })
    
    // Get user from Supabase (more secure than getSession)
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      logger.error('Error getting user', error)
      return NextResponse.redirect(new URL('/auth/start', request.url))
    }
    
    if (!user) {
      logger.info('No user found for private route', { path: pathname })
      return NextResponse.redirect(new URL('/auth/start', request.url))
    }
    
    logger.debug('Valid user found', { 
      path: pathname, 
      userId: user?.id,
      email: user?.email 
    })
    
    // Log successful auth
    const duration = Date.now() - startTime
    logger.api(request.method, pathname, 200, duration, { 
      type: 'authenticated',
      userId: user?.id 
    })
    
    return response
    
  } catch (error) {
    logger.error('Authentication error in middleware', error)
    return NextResponse.redirect(new URL('/auth/start', request.url))
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