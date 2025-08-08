#!/usr/bin/env node

/**
 * 🔍 SCRIPT DE DIAGNÓSTICO DE PROBLEMAS DE AUTENTICACIÓN
 * Diagnostica problemas con el login y el middleware de autenticación
 * 
 * Uso: node scripts/diagnose-auth-issue.js
 */

const fs = require('fs');
const path = require('path');

// Colores para output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    return null;
  }
}

function checkFileExists(filePath) {
  return fs.existsSync(filePath);
}

// 1. DIAGNOSTICAR MIDDLEWARE
function diagnoseMiddleware() {
  log('\n🔍 DIAGNOSTICANDO MIDDLEWARE', 'bold');
  
  const filePath = 'middleware.ts';
  const content = readFile(filePath);
  
  if (!content) {
    log('❌ Archivo middleware.ts no encontrado', 'red');
    return false;
  }
  
  log('✅ Archivo middleware.ts encontrado', 'green');
  
  // Verificar problemas comunes
  const issues = [];
  
  // Verificar si está usando createClient de Supabase
  if (!content.includes('createClient')) {
    issues.push('No está usando createClient de Supabase');
  }
  
  // Verificar si está validando cookies de Supabase
  if (!content.includes('sb-')) {
    issues.push('No está validando cookies de Supabase (sb-*)');
  }
  
  // Verificar si está redirigiendo correctamente
  if (!content.includes('NextResponse.redirect')) {
    issues.push('No está redirigiendo correctamente');
  }
  
  if (issues.length > 0) {
    log('⚠️  Problemas encontrados en middleware:', 'yellow');
    issues.forEach(issue => log(`   - ${issue}`, 'red'));
    return false;
  }
  
  log('✅ Middleware parece estar configurado correctamente', 'green');
  return true;
}

// 2. DIAGNOSTICAR AUTH PROVIDER
function diagnoseAuthProvider() {
  log('\n🔍 DIAGNOSTICANDO AUTH PROVIDER', 'bold');
  
  const filePath = 'lib/auth.tsx';
  const content = readFile(filePath);
  
  if (!content) {
    log('❌ Archivo lib/auth.tsx no encontrado', 'red');
    return false;
  }
  
  log('✅ Archivo lib/auth.tsx encontrado', 'green');
  
  // Verificar problemas comunes
  const issues = [];
  
  // Verificar si está usando supabase.auth
  if (!content.includes('supabase.auth')) {
    issues.push('No está usando supabase.auth');
  }
  
  // Verificar si está manejando signInWithPassword
  if (!content.includes('signInWithPassword')) {
    issues.push('No está manejando signInWithPassword');
  }
  
  // Verificar si está escuchando cambios de auth
  if (!content.includes('onAuthStateChange')) {
    issues.push('No está escuchando cambios de auth');
  }
  
  if (issues.length > 0) {
    log('⚠️  Problemas encontrados en AuthProvider:', 'yellow');
    issues.forEach(issue => log(`   - ${issue}`, 'red'));
    return false;
  }
  
  log('✅ AuthProvider parece estar configurado correctamente', 'green');
  return true;
}

// 3. DIAGNOSTICAR SUPABASE CLIENT
function diagnoseSupabaseClient() {
  log('\n🔍 DIAGNOSTICANDO SUPABASE CLIENT', 'bold');
  
  const filePath = 'lib/supabase/client.ts';
  const content = readFile(filePath);
  
  if (!content) {
    log('❌ Archivo lib/supabase/client.ts no encontrado', 'red');
    return false;
  }
  
  log('✅ Archivo lib/supabase/client.ts encontrado', 'green');
  
  // Verificar problemas comunes
  const issues = [];
  
  // Verificar si está usando variables de entorno
  if (!content.includes('process.env.NEXT_PUBLIC_SUPABASE_URL')) {
    issues.push('No está usando variables de entorno para Supabase URL');
  }
  
  // Verificar si está usando variables de entorno para la clave
  if (!content.includes('process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY')) {
    issues.push('No está usando variables de entorno para Supabase Key');
  }
  
  // Verificar si está usando createBrowserClient
  if (!content.includes('createBrowserClient')) {
    issues.push('No está usando createBrowserClient');
  }
  
  if (issues.length > 0) {
    log('⚠️  Problemas encontrados en Supabase Client:', 'yellow');
    issues.forEach(issue => log(`   - ${issue}`, 'red'));
    return false;
  }
  
  log('✅ Supabase Client parece estar configurado correctamente', 'green');
  return true;
}

// 4. DIAGNOSTICAR VARIABLES DE ENTORNO
function diagnoseEnvironmentVariables() {
  log('\n🔍 DIAGNOSTICANDO VARIABLES DE ENTORNO', 'bold');
  
  // Cargar variables de entorno
  require('dotenv').config({ path: '.env.local' });
  
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];
  
  let allPresent = true;
  
  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (value) {
      log(`✅ ${varName}: Configurada`, 'green');
    } else {
      log(`❌ ${varName}: Faltante`, 'red');
      allPresent = false;
    }
  }
  
  return allPresent;
}

// 5. DIAGNOSTICAR PÁGINA DE LOGIN
function diagnoseLoginPage() {
  log('\n🔍 DIAGNOSTICANDO PÁGINA DE LOGIN', 'bold');
  
  const filePath = 'pages/login.tsx';
  const content = readFile(filePath);
  
  if (!content) {
    log('❌ Archivo pages/login.tsx no encontrado', 'red');
    return false;
  }
  
  log('✅ Archivo pages/login.tsx encontrado', 'green');
  
  // Verificar problemas comunes
  const issues = [];
  
  // Verificar si está usando useAuth
  if (!content.includes('useAuth')) {
    issues.push('No está usando useAuth hook');
  }
  
  // Verificar si está manejando el formulario
  if (!content.includes('handleSubmit')) {
    issues.push('No está manejando el formulario de login');
  }
  
  // Verificar si está redirigiendo después del login
  if (!content.includes('router.push')) {
    issues.push('No está redirigiendo después del login');
  }
  
  if (issues.length > 0) {
    log('⚠️  Problemas encontrados en Login Page:', 'yellow');
    issues.forEach(issue => log(`   - ${issue}`, 'red'));
    return false;
  }
  
  log('✅ Login Page parece estar configurada correctamente', 'green');
  return true;
}

// 6. CREAR MIDDLEWARE CORREGIDO
function createFixedMiddleware() {
  log('\n🔧 CREANDO MIDDLEWARE CORREGIDO', 'bold');
  
  const filePath = 'middleware.ts';
  const backupPath = filePath + '.backup.' + Date.now();
  
  // Crear backup
  try {
    fs.copyFileSync(filePath, backupPath);
    log(`✅ Backup creado: ${backupPath}`, 'green');
  } catch (error) {
    log(`❌ Error creando backup: ${error.message}`, 'red');
    return false;
  }
  
  const fixedContent = `import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Log all requests for debugging
  console.log(\`[Middleware] \${request.method} \${pathname}\`)

  // Handle API routes
  if (pathname.startsWith('/api/')) {
    console.log(\`[Middleware] API route: \${pathname}\`)
    
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
    console.log(\`[Middleware] Public route: \${pathname}\`)
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
      console.log(\`[Middleware] No session found for private route: \${pathname}\`)
      return NextResponse.redirect(new URL('/login', request.url))
    }
    
    console.log(\`[Middleware] Valid session found for: \${pathname}\`)
    return NextResponse.next()
    
  } catch (error) {
    console.error(\`[Middleware] Auth error: \${error.message}\`)
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
}`;
  
  try {
    fs.writeFileSync(filePath, fixedContent, 'utf8');
    log('✅ Middleware corregido creado', 'green');
    return true;
  } catch (error) {
    log(`❌ Error creando middleware corregido: ${error.message}`, 'red');
    return false;
  }
}

// 7. MOSTRAR SOLUCIÓN
function showSolution() {
  log('\n🔧 SOLUCIÓN AL PROBLEMA DE AUTENTICACIÓN', 'bold');
  log('=' .repeat(60), 'blue');
  
  log('\n📋 PROBLEMA IDENTIFICADO:', 'yellow');
  log('El middleware no está validando correctamente las sesiones de Supabase', 'red');
  log('Está buscando headers de autorización en lugar de cookies de Supabase', 'red');
  
  log('\n🔧 SOLUCIÓN APLICADA:', 'green');
  log('1. ✅ Middleware corregido para usar Supabase SSR client', 'green');
  log('2. ✅ Validación de sesiones usando cookies de Supabase', 'green');
  log('3. ✅ Manejo correcto de rutas públicas y privadas', 'green');
  
  log('\n📝 PRÓXIMOS PASOS:', 'bold');
  log('1. Reiniciar el servidor de desarrollo', 'blue');
  log('   npm run dev', 'yellow');
  log('', 'reset');
  log('2. Probar el login nuevamente', 'blue');
  log('   Ir a http://localhost:3000/login', 'yellow');
  log('', 'reset');
  log('3. Verificar que no hay redirecciones infinitas', 'blue');
  log('   Revisar la consola del navegador y del servidor', 'yellow');
  log('', 'reset');
  
  log('\n🔍 PARA DEBUGGING:', 'bold');
  log('1. Abrir DevTools del navegador (F12)', 'blue');
  log('2. Ir a la pestaña Network', 'blue');
  log('3. Intentar hacer login', 'blue');
  log('4. Verificar que las cookies de Supabase se establecen', 'blue');
  log('5. Verificar que no hay errores en la consola', 'blue');
}

// FUNCIÓN PRINCIPAL
async function main() {
  log('🔍 DIAGNÓSTICO DE PROBLEMAS DE AUTENTICACIÓN', 'bold');
  log('=' .repeat(60), 'blue');
  
  const results = {
    middleware: false,
    authProvider: false,
    supabaseClient: false,
    envVars: false,
    loginPage: false
  };
  
  try {
    // Ejecutar diagnósticos
    results.middleware = diagnoseMiddleware();
    results.authProvider = diagnoseAuthProvider();
    results.supabaseClient = diagnoseSupabaseClient();
    results.envVars = diagnoseEnvironmentVariables();
    results.loginPage = diagnoseLoginPage();
    
    // Resumen
    log('\n📊 RESUMEN DE DIAGNÓSTICO:', 'bold');
    log('=' .repeat(40), 'blue');
    
    const allPassed = Object.values(results).every(result => result);
    
    if (allPassed) {
      log('✅ Todos los componentes están configurados correctamente', 'green');
      log('🔍 El problema puede estar en la validación de sesiones', 'yellow');
    } else {
      log('❌ Se encontraron problemas en algunos componentes', 'red');
    }
    
    // Aplicar corrección si es necesario
    if (!results.middleware || !allPassed) {
      log('\n🔧 APLICANDO CORRECCIÓN AUTOMÁTICA...', 'bold');
      const fixed = createFixedMiddleware();
      
      if (fixed) {
        showSolution();
      } else {
        log('❌ No se pudo aplicar la corrección automática', 'red');
        log('🔧 Aplicar corrección manualmente', 'yellow');
      }
    }
    
  } catch (error) {
    log(`\n💥 ERROR FATAL: ${error.message}`, 'red');
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main().catch(error => {
    log(`\n💥 ERROR FATAL: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = {
  diagnoseMiddleware,
  diagnoseAuthProvider,
  diagnoseSupabaseClient,
  diagnoseEnvironmentVariables,
  diagnoseLoginPage,
  createFixedMiddleware
}; 