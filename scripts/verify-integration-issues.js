#!/usr/bin/env node

/**
 * Script de Verificación de Problemas de Integración Frontend-Backend
 * Valida los problemas identificados en la auditoría
 */

const fs = require('fs')
const path = require('path')

// Colores para output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
}

// Contadores
let criticalIssues = 0
let highIssues = 0
let mediumIssues = 0
let lowIssues = 0
let passedChecks = 0

function log(message, level = 'info') {
  const timestamp = new Date().toISOString()
  const prefix = {
    critical: `${colors.red}${colors.bold}[CRÍTICO]${colors.reset}`,
    high: `${colors.yellow}${colors.bold}[ALTO]${colors.reset}`,
    medium: `${colors.blue}${colors.bold}[MEDIO]${colors.reset}`,
    low: `${colors.cyan}${colors.bold}[BAJO]${colors.reset}`,
    success: `${colors.green}${colors.bold}[✓]${colors.reset}`,
    info: `${colors.white}[INFO]${colors.reset}`
  }[level]
  
  console.log(`${prefix} ${timestamp} - ${message}`)
}

function checkFileExists(filePath) {
  return fs.existsSync(filePath)
}

function readFileContent(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8')
  } catch (error) {
    return null
  }
}

function checkHardcodedCredentials() {
  log('Verificando credenciales hardcodeadas...', 'info')
  
  const supabaseClientPath = 'lib/supabase/client.ts'
  if (!checkFileExists(supabaseClientPath)) {
    log(`Archivo no encontrado: ${supabaseClientPath}`, 'critical')
    criticalIssues++
    return
  }
  
  const content = readFileContent(supabaseClientPath)
  if (!content) {
    log(`No se pudo leer: ${supabaseClientPath}`, 'critical')
    criticalIssues++
    return
  }
  
  // Buscar credenciales hardcodeadas
  const hardcodedUrl = content.includes('https://fwyxmovfrzauebiqxchz.supabase.co')
  const hardcodedKey = content.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9')
  
  if (hardcodedUrl || hardcodedKey) {
    log('CRÍTICO: Credenciales hardcodeadas encontradas en lib/supabase/client.ts', 'critical')
    log('  - URL de Supabase hardcodeada', 'critical')
    log('  - API Key de Supabase hardcodeada', 'critical')
    criticalIssues++
  } else {
    log('✓ No se encontraron credenciales hardcodeadas', 'success')
    passedChecks++
  }
}

function checkMiddlewareAuth() {
  log('Verificando middleware de autenticación...', 'info')
  
  const middlewarePath = 'middleware.ts'
  if (!checkFileExists(middlewarePath)) {
    log(`Archivo no encontrado: ${middlewarePath}`, 'critical')
    criticalIssues++
    return
  }
  
  const content = readFileContent(middlewarePath)
  if (!content) {
    log(`No se pudo leer: ${middlewarePath}`, 'critical')
    criticalIssues++
    return
  }
  
  // Verificar si hay validación real de autenticación
  const hasAuthValidation = content.includes('supabase.auth.getUser') || content.includes('supabase.auth.getSession')
  const hasPublicRoutes = content.includes('publicRoutes')
  const hasProtectedRoutes = content.includes('protectedRoutes')
  
  if (!hasAuthValidation) {
    log('CRÍTICO: Middleware no valida autenticación real', 'critical')
    criticalIssues++
  } else if (!hasProtectedRoutes) {
    log('ALTO: Middleware no define rutas protegidas', 'high')
    highIssues++
  } else {
    log('✓ Middleware tiene validación de autenticación', 'success')
    passedChecks++
  }
}

function checkEndpointsWithoutAuth() {
  log('Verificando endpoints sin autenticación...', 'info')
  
  const apiDir = 'pages/api'
  if (!checkFileExists(apiDir)) {
    log(`Directorio no encontrado: ${apiDir}`, 'critical')
    criticalIssues++
    return
  }
  
  const criticalEndpoints = [
    'pages/api/attendance/register.ts',
    'pages/api/attendance/lookup.ts',
    'pages/api/attendance/health.ts'
  ]
  
  let endpointsWithoutAuth = 0
  
  criticalEndpoints.forEach(endpoint => {
    if (!checkFileExists(endpoint)) {
      log(`Endpoint no encontrado: ${endpoint}`, 'medium')
      mediumIssues++
      return
    }
    
    const content = readFileContent(endpoint)
    if (!content) return
    
    // Verificar si tiene validación de autenticación
    const hasAuthCheck = content.includes('supabase.auth.getUser') || 
                        content.includes('supabase.auth.getSession') ||
                        content.includes('createClient(req, res)')
    
    if (!hasAuthCheck) {
      log(`ALTO: Endpoint sin autenticación: ${endpoint}`, 'high')
      endpointsWithoutAuth++
      highIssues++
    }
  })
  
  if (endpointsWithoutAuth === 0) {
    log('✓ Todos los endpoints críticos tienen autenticación', 'success')
    passedChecks++
  }
}

function checkFetchRequests() {
  log('Verificando fetch requests...', 'info')
  
  const componentsDir = 'components'
  const pagesDir = 'pages'
  
  let fetchWithoutTryCatch = 0
  let fetchWithoutAuth = 0
  
  // Buscar archivos TypeScript/JavaScript
  function scanDirectory(dir) {
    if (!checkFileExists(dir)) return []
    
    const files = fs.readdirSync(dir, { withFileTypes: true })
    const tsxFiles = files
      .filter(file => file.isFile() && (file.name.endsWith('.tsx') || file.name.endsWith('.ts')))
      .map(file => path.join(dir, file.name))
    
    return tsxFiles
  }
  
  const allFiles = [...scanDirectory(componentsDir), ...scanDirectory(pagesDir)]
  
  allFiles.forEach(file => {
    const content = readFileContent(file)
    if (!content) return
    
    // Buscar fetch sin try/catch
    const fetchMatches = content.match(/fetch\([^)]+\)/g) || []
    fetchMatches.forEach(match => {
      const lines = content.split('\n')
      const fetchLineIndex = lines.findIndex(line => line.includes(match))
      
      if (fetchLineIndex !== -1) {
        // Verificar si hay try/catch alrededor
        const beforeLines = lines.slice(Math.max(0, fetchLineIndex - 10), fetchLineIndex)
        const afterLines = lines.slice(fetchLineIndex + 1, fetchLineIndex + 10)
        
        const hasTryCatch = beforeLines.some(line => line.includes('try')) && 
                           afterLines.some(line => line.includes('catch'))
        
        if (!hasTryCatch) {
          log(`MEDIO: Fetch sin try/catch en ${file}:${fetchLineIndex + 1}`, 'medium')
          fetchWithoutTryCatch++
          mediumIssues++
        }
      }
    })
    
    // Buscar fetch sin headers de autenticación
    const fetchWithHeaders = content.match(/fetch\([^)]+,\s*{[^}]*headers[^}]*}/g) || []
    fetchWithHeaders.forEach(match => {
      if (!match.includes('Authorization') && !match.includes('Bearer')) {
        log(`ALTO: Fetch sin headers de auth en ${file}`, 'high')
        fetchWithoutAuth++
        highIssues++
      }
    })
  })
  
  if (fetchWithoutTryCatch === 0 && fetchWithoutAuth === 0) {
    log('✓ Todos los fetch requests tienen manejo de errores y autenticación', 'success')
    passedChecks++
  }
}

function checkCentralizedServices() {
  log('Verificando servicios centralizados...', 'info')
  
  const servicesPath = 'lib/services/api.ts'
  const hooksPath = 'lib/hooks/useApi.ts'
  
  if (!checkFileExists(servicesPath)) {
    log('MEDIO: Servicios centralizados no encontrados', 'medium')
    mediumIssues++
  } else {
    log('✓ Servicios centralizados existen', 'success')
    passedChecks++
  }
  
  if (!checkFileExists(hooksPath)) {
    log('MEDIO: Hooks personalizados no encontrados', 'medium')
    mediumIssues++
  } else {
    log('✓ Hooks personalizados existen', 'success')
    passedChecks++
  }
  
  // Verificar si los componentes usan los servicios centralizados
  const componentsDir = 'components'
  if (checkFileExists(componentsDir)) {
    const files = fs.readdirSync(componentsDir, { withFileTypes: true })
    const tsxFiles = files
      .filter(file => file.isFile() && file.name.endsWith('.tsx'))
      .map(file => path.join(componentsDir, file.name))
    
    let componentsNotUsingServices = 0
    
    tsxFiles.forEach(file => {
      const content = readFileContent(file)
      if (!content) return
      
      // Verificar si usa servicios centralizados
      const usesApiService = content.includes('apiService') || content.includes('useApi')
      const usesSupabaseDirect = content.includes('supabase.from') || content.includes('supabase.auth')
      
      if (usesSupabaseDirect && !usesApiService) {
        log(`BAJO: Componente no usa servicios centralizados: ${file}`, 'low')
        componentsNotUsingServices++
        lowIssues++
      }
    })
    
    if (componentsNotUsingServices === 0) {
      log('✓ Todos los componentes usan servicios centralizados', 'success')
      passedChecks++
    }
  }
}

function checkCORSConfiguration() {
  log('Verificando configuración CORS...', 'info')
  
  const nextConfigPath = 'next.config.js'
  if (!checkFileExists(nextConfigPath)) {
    log(`Archivo no encontrado: ${nextConfigPath}`, 'medium')
    mediumIssues++
    return
  }
  
  const content = readFileContent(nextConfigPath)
  if (!content) {
    log(`No se pudo leer: ${nextConfigPath}`, 'medium')
    mediumIssues++
    return
  }
  
  // Verificar si CORS está configurado correctamente
  const hasCORSConfig = content.includes('Access-Control-Allow-Origin')
  const hasSpecificOrigin = content.includes('humanosisu.net') || content.includes('localhost')
  const hasWildcardOrigin = content.includes("'*'")
  
  if (!hasCORSConfig) {
    log('MEDIO: No hay configuración CORS', 'medium')
    mediumIssues++
  } else if (hasWildcardOrigin) {
    log('ALTO: CORS configurado con wildcard (*)', 'high')
    highIssues++
  } else if (hasSpecificOrigin) {
    log('✓ CORS configurado con origen específico', 'success')
    passedChecks++
  } else {
    log('MEDIO: Configuración CORS no clara', 'medium')
    mediumIssues++
  }
}

function checkValidationSchemas() {
  log('Verificando schemas de validación...', 'info')
  
  const validationPath = 'lib/validation/schemas.ts'
  if (!checkFileExists(validationPath)) {
    log('MEDIO: Schemas de validación no encontrados', 'medium')
    mediumIssues++
  } else {
    const content = readFileContent(validationPath)
    if (content && content.includes('z.object')) {
      log('✓ Schemas de validación existen', 'success')
      passedChecks++
    } else {
      log('MEDIO: Schemas de validación vacíos o mal configurados', 'medium')
      mediumIssues++
    }
  }
}

function checkEnvironmentVariables() {
  log('Verificando variables de entorno...', 'info')
  
  const envFiles = ['.env.local', '.env', '.env.example']
  let envFileFound = false
  
  envFiles.forEach(envFile => {
    if (checkFileExists(envFile)) {
      envFileFound = true
      const content = readFileContent(envFile)
      if (content) {
        const hasSupabaseUrl = content.includes('NEXT_PUBLIC_SUPABASE_URL')
        const hasSupabaseKey = content.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY')
        
        if (hasSupabaseUrl && hasSupabaseKey) {
          log(`✓ Variables de entorno encontradas en ${envFile}`, 'success')
          passedChecks++
        } else {
          log(`MEDIO: Variables de Supabase faltantes en ${envFile}`, 'medium')
          mediumIssues++
        }
      }
    }
  })
  
  if (!envFileFound) {
    log('MEDIO: No se encontraron archivos de variables de entorno', 'medium')
    mediumIssues++
  }
}

function generateReport() {
  const totalIssues = criticalIssues + highIssues + mediumIssues + lowIssues
  const totalChecks = totalIssues + passedChecks
  
  console.log('\n' + '='.repeat(80))
  console.log(`${colors.bold}${colors.cyan}REPORTE DE VERIFICACIÓN DE INTEGRACIÓN${colors.reset}`)
  console.log('='.repeat(80))
  
  console.log(`\n${colors.bold}Resumen:${colors.reset}`)
  console.log(`  Total de verificaciones: ${totalChecks}`)
  console.log(`  Verificaciones exitosas: ${colors.green}${passedChecks}${colors.reset}`)
  console.log(`  Problemas encontrados: ${colors.red}${totalIssues}${colors.reset}`)
  
  console.log(`\n${colors.bold}Desglose por severidad:${colors.reset}`)
  console.log(`  ${colors.red}${colors.bold}Críticos:${colors.reset} ${criticalIssues}`)
  console.log(`  ${colors.yellow}${colors.bold}Altos:${colors.reset} ${highIssues}`)
  console.log(`  ${colors.blue}${colors.bold}Medios:${colors.reset} ${mediumIssues}`)
  console.log(`  ${colors.cyan}${colors.bold}Bajos:${colors.reset} ${lowIssues}`)
  
  console.log(`\n${colors.bold}Recomendaciones:${colors.reset}`)
  
  if (criticalIssues > 0) {
    console.log(`  ${colors.red}${colors.bold}⚠️  CRÍTICO:${colors.reset} Resolver problemas críticos inmediatamente`)
  }
  
  if (highIssues > 0) {
    console.log(`  ${colors.yellow}${colors.bold}⚠️  ALTO:${colors.reset} Resolver problemas de seguridad en 1 semana`)
  }
  
  if (mediumIssues > 0) {
    console.log(`  ${colors.blue}${colors.bold}ℹ️  MEDIO:${colors.reset} Mejorar estructura y mantenibilidad en 2-3 semanas`)
  }
  
  if (lowIssues > 0) {
    console.log(`  ${colors.cyan}${colors.bold}ℹ️  BAJO:${colors.reset} Optimizaciones opcionales en 1 mes`)
  }
  
  if (totalIssues === 0) {
    console.log(`  ${colors.green}${colors.bold}🎉 ¡Excelente! No se encontraron problemas${colors.reset}`)
  }
  
  console.log('\n' + '='.repeat(80))
  
  // Guardar reporte en archivo
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalChecks,
      passedChecks,
      totalIssues,
      criticalIssues,
      highIssues,
      mediumIssues,
      lowIssues
    },
    recommendations: {
      critical: criticalIssues > 0 ? 'Resolver problemas críticos inmediatamente' : null,
      high: highIssues > 0 ? 'Resolver problemas de seguridad en 1 semana' : null,
      medium: mediumIssues > 0 ? 'Mejorar estructura y mantenibilidad en 2-3 semanas' : null,
      low: lowIssues > 0 ? 'Optimizaciones opcionales en 1 mes' : null
    }
  }
  
  fs.writeFileSync('integration-verification-report.json', JSON.stringify(report, null, 2))
  console.log(`\n${colors.green}Reporte guardado en: integration-verification-report.json${colors.reset}`)
}

// Ejecutar verificaciones
async function main() {
  console.log(`${colors.bold}${colors.cyan}🔍 VERIFICACIÓN DE PROBLEMAS DE INTEGRACIÓN FRONTEND-BACKEND${colors.reset}\n`)
  
  checkHardcodedCredentials()
  checkMiddlewareAuth()
  checkEndpointsWithoutAuth()
  checkFetchRequests()
  checkCentralizedServices()
  checkCORSConfiguration()
  checkValidationSchemas()
  checkEnvironmentVariables()
  
  generateReport()
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main().catch(console.error)
}

module.exports = {
  checkHardcodedCredentials,
  checkMiddlewareAuth,
  checkEndpointsWithoutAuth,
  checkFetchRequests,
  checkCentralizedServices,
  checkCORSConfiguration,
  checkValidationSchemas,
  checkEnvironmentVariables,
  generateReport
} 