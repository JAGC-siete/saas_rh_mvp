// Script para verificar protección de autenticación en páginas y rutas API
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

const verifyAuthProtection = () => {
  console.log('🔍 Verificando protección de autenticación...\n')
  
  const issues = []
  const warnings = []
  const successes = []
  
  // 1. Verificar páginas que NO deberían usar ProtectedRoute
  console.log('📋 1. Verificando páginas públicas...')
  const publicPages = [
    'pages/index.tsx',
    'pages/login.tsx', 
    'pages/registrodeasistencia.tsx',
    'pages/unauthorized.tsx'
  ]
  
  publicPages.forEach(pagePath => {
    try {
      const content = readFileSync(pagePath, 'utf8')
      if (content.includes('ProtectedRoute')) {
        issues.push(`❌ ${pagePath} NO debería usar ProtectedRoute (es página pública)`)
      } else {
        successes.push(`✅ ${pagePath} correctamente sin ProtectedRoute`)
      }
    } catch (error) {
      warnings.push(`⚠️ No se pudo leer ${pagePath}: ${error.message}`)
    }
  })
  
  // 2. Verificar páginas que SÍ deberían usar ProtectedRoute
  console.log('\n📋 2. Verificando páginas protegidas...')
  const protectedPages = [
    'pages/dashboard.tsx',
    'pages/employees.tsx',
    'pages/departments.tsx',
    'pages/leaves.tsx',
    'pages/asistencia-nueva.tsx',
    'pages/attendance-smart.tsx',
    'pages/employees/index.tsx',
    'pages/departments/index.tsx',
    'pages/attendance/index.tsx',
    'pages/leave/index.tsx',
    'pages/payroll/index.tsx',
    'pages/reports/index.tsx',
    'pages/settings/index.tsx'
  ]
  
  protectedPages.forEach(pagePath => {
    try {
      const content = readFileSync(pagePath, 'utf8')
      if (content.includes('ProtectedRoute')) {
        successes.push(`✅ ${pagePath} correctamente protegida con ProtectedRoute`)
      } else {
        issues.push(`❌ ${pagePath} debería usar ProtectedRoute`)
      }
    } catch (error) {
      warnings.push(`⚠️ No se pudo leer ${pagePath}: ${error.message}`)
    }
  })
  
  // 3. Verificar rutas API públicas (asistencia)
  console.log('\n📋 3. Verificando rutas API públicas...')
  const publicApiRoutes = [
    'pages/api/attendance/lookup.ts',
    'pages/api/attendance/register.ts',
    'pages/api/health.ts'
  ]
  
  publicApiRoutes.forEach(apiPath => {
    try {
      const content = readFileSync(apiPath, 'utf8')
      if (content.includes('supabase.auth.getUser') || content.includes('createClient(req, res)')) {
        issues.push(`❌ ${apiPath} NO debería validar autenticación (es API pública)`)
      } else {
        successes.push(`✅ ${apiPath} correctamente sin validación de auth`)
      }
    } catch (error) {
      warnings.push(`⚠️ No se pudo leer ${apiPath}: ${error.message}`)
    }
  })
  
  // 4. Verificar rutas API protegidas
  console.log('\n📋 4. Verificando rutas API protegidas...')
  const protectedApiRoutes = [
    'pages/api/payroll.ts',
    'pages/api/payroll/records.ts',
    'pages/api/payroll/calculate.ts',
    'pages/api/payroll/export.ts',
    'pages/api/auth/validate.ts'
  ]
  
  // Rutas de login son especiales - no requieren auth previa
  const loginApiRoutes = [
    'pages/api/auth/login.ts',
    'pages/api/auth/login-supabase.ts'
  ]
  
  protectedApiRoutes.forEach(apiPath => {
    try {
      const content = readFileSync(apiPath, 'utf8')
      if (content.includes('supabase.auth.getUser') || content.includes('createClient(req, res)')) {
        const hasAuthCheck = content.includes('401') || content.includes('Unauthorized')
        if (hasAuthCheck) {
          successes.push(`✅ ${apiPath} correctamente protegida con validación de auth`)
        } else {
          warnings.push(`⚠️ ${apiPath} tiene cliente auth pero no valida 401`)
        }
      } else {
        issues.push(`❌ ${apiPath} debería validar autenticación`)
      }
    } catch (error) {
      warnings.push(`⚠️ No se pudo leer ${apiPath}: ${error.message}`)
    }
  })
  
  // Verificar rutas de login (especiales)
  console.log('\n📋 4.1. Verificando rutas API de login...')
  loginApiRoutes.forEach(apiPath => {
    try {
      const content = readFileSync(apiPath, 'utf8')
      if (content.includes('// Para rutas de login, no validamos autenticación previa')) {
        successes.push(`✅ ${apiPath} correctamente configurada como ruta de login`)
      } else {
        warnings.push(`⚠️ ${apiPath} debería tener comentario explicativo sobre no validar auth`)
      }
    } catch (error) {
      warnings.push(`⚠️ No se pudo leer ${apiPath}: ${error.message}`)
    }
  })
  
  // 5. Verificar middleware
  console.log('\n📋 5. Verificando configuración del middleware...')
  try {
    const middlewareContent = readFileSync('middleware.ts', 'utf8')
    const hasPublicRoutes = middlewareContent.includes('/registrodeasistencia')
    const hasApiPublicRoutes = middlewareContent.includes('/api/attendance/lookup')
    
    if (hasPublicRoutes && hasApiPublicRoutes) {
      successes.push('✅ Middleware correctamente configurado con rutas públicas')
    } else {
      issues.push('❌ Middleware no tiene todas las rutas públicas necesarias')
    }
  } catch (error) {
    warnings.push(`⚠️ No se pudo leer middleware.ts: ${error.message}`)
  }
  
  // 6. Verificar componente ProtectedRoute
  console.log('\n📋 6. Verificando componente ProtectedRoute...')
  try {
    const protectedRouteContent = readFileSync('components/ProtectedRoute.tsx', 'utf8')
    const hasSessionCheck = protectedRouteContent.includes('useSupabaseSession')
    const hasRedirect = protectedRouteContent.includes('router.push')
    const hasLoading = protectedRouteContent.includes('sessionLoading')
    
    if (hasSessionCheck && hasRedirect && hasLoading) {
      successes.push('✅ Componente ProtectedRoute correctamente implementado')
    } else {
      issues.push('❌ Componente ProtectedRoute incompleto')
    }
  } catch (error) {
    warnings.push(`⚠️ No se pudo leer ProtectedRoute.tsx: ${error.message}`)
  }
  
  // 7. Buscar páginas adicionales
  console.log('\n📋 7. Buscando páginas adicionales...')
  try {
    const pagesDir = 'pages'
    const files = readdirSync(pagesDir, { recursive: true })
    
    const pageFiles = files.filter(file => 
      typeof file === 'string' && 
      (file.endsWith('.tsx') || file.endsWith('.ts')) &&
      !file.includes('api/') &&
      !file.includes('_app') &&
      !file.includes('_document')
    )
    
    pageFiles.forEach(file => {
      const pagePath = `pages/${file}`
      if (!publicPages.includes(pagePath) && !protectedPages.includes(pagePath)) {
        try {
          const content = readFileSync(pagePath, 'utf8')
          if (content.includes('ProtectedRoute')) {
            successes.push(`✅ ${pagePath} protegida (encontrada automáticamente)`)
          } else {
            warnings.push(`⚠️ ${pagePath} no verificado - revisar si necesita protección`)
          }
        } catch (error) {
          warnings.push(`⚠️ No se pudo leer ${pagePath}: ${error.message}`)
        }
      }
    })
  } catch (error) {
    warnings.push(`⚠️ No se pudo explorar directorio pages: ${error.message}`)
  }
  
  // 8. Buscar rutas API adicionales
  console.log('\n📋 8. Buscando rutas API adicionales...')
  try {
    const apiDir = 'pages/api'
    const files = readdirSync(apiDir, { recursive: true })
    
    const apiFiles = files.filter(file => 
      typeof file === 'string' && 
      (file.endsWith('.ts') || file.endsWith('.js'))
    )
    
    apiFiles.forEach(file => {
      const apiPath = `pages/api/${file}`
      if (!publicApiRoutes.includes(apiPath) && !protectedApiRoutes.includes(apiPath)) {
        try {
          const content = readFileSync(apiPath, 'utf8')
          if (content.includes('supabase.auth.getUser') || content.includes('createClient(req, res)')) {
            const hasAuthCheck = content.includes('401') || content.includes('Unauthorized')
            if (hasAuthCheck) {
              successes.push(`✅ ${apiPath} protegida (encontrada automáticamente)`)
            } else {
              warnings.push(`⚠️ ${apiPath} tiene auth pero no valida 401`)
            }
          } else {
            warnings.push(`⚠️ ${apiPath} no verificado - revisar si necesita protección`)
          }
        } catch (error) {
          warnings.push(`⚠️ No se pudo leer ${apiPath}: ${error.message}`)
        }
      }
    })
  } catch (error) {
    warnings.push(`⚠️ No se pudo explorar directorio api: ${error.message}`)
  }
  
  // Resumen
  console.log('\n📊 RESUMEN DE VERIFICACIÓN')
  console.log('='.repeat(50))
  
  if (successes.length > 0) {
    console.log('\n✅ ÉXITOS:')
    successes.forEach(success => console.log(success))
  }
  
  if (warnings.length > 0) {
    console.log('\n⚠️ ADVERTENCIAS:')
    warnings.forEach(warning => console.log(warning))
  }
  
  if (issues.length > 0) {
    console.log('\n❌ PROBLEMAS ENCONTRADOS:')
    issues.forEach(issue => console.log(issue))
  }
  
  console.log('\n📈 ESTADÍSTICAS:')
  console.log(`- Éxitos: ${successes.length}`)
  console.log(`- Advertencias: ${warnings.length}`)
  console.log(`- Problemas: ${issues.length}`)
  
  if (issues.length === 0) {
    console.log('\n🎉 ¡Todas las verificaciones de autenticación están correctas!')
  } else {
    console.log('\n🔧 Se encontraron problemas que requieren atención.')
  }
  
  return {
    successes,
    warnings,
    issues
  }
}

// Ejecutar verificación
verifyAuthProtection() 