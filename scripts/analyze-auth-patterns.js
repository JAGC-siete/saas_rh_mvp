#!/usr/bin/env node

/**
 * Script para analizar las diferencias en patrones de autenticación
 * entre diferentes APIs del dashboard
 */

const fs = require('fs')
const path = require('path')

// Mapeo de patrones de autenticación encontrados
const authPatterns = {
  'requireCompanyAccess': {
    description: 'Nuevo patrón estandarizado - requiere acceso a empresa',
    files: [],
    client: 'createClient(req, res)',
    validation: 'companyId + role validation',
    filtering: 'Automatic company filtering'
  },
  'requireRoles': {
    description: 'Nuevo patrón estandarizado - requiere roles específicos',
    files: [],
    client: 'createClient(req, res)',
    validation: 'role-based validation',
    filtering: 'Manual filtering required'
  },
  'requireUser': {
    description: 'Patrón legacy - solo requiere usuario',
    files: [],
    client: 'createClient(req, res)',
    validation: 'basic user validation',
    filtering: 'Manual filtering required'
  },
  'authenticateUser (auth-helpers)': {
    description: 'Patrón legacy con permisos - más complejo',
    files: [],
    client: 'createClient(req, res)',
    validation: 'permission-based validation',
    filtering: 'Manual filtering required'
  },
  'authenticateUser (api-auth)': {
    description: 'Patrón nuevo estandarizado - más simple',
    files: [],
    client: 'createServerClient directo',
    validation: 'role + permission validation',
    filtering: 'Manual filtering required'
  },
  'createAdminClient': {
    description: 'Sin autenticación - usa service role',
    files: [],
    client: 'createAdminClient()',
    validation: 'none',
    filtering: 'none'
  }
}

// Función para analizar un archivo
function analyzeFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    const relativePath = path.relative(process.cwd(), filePath)
    
    // Detectar patrón de autenticación
    if (content.includes('requireCompanyAccess')) {
      authPatterns['requireCompanyAccess'].files.push(relativePath)
    } else if (content.includes('requireRoles')) {
      authPatterns['requireRoles'].files.push(relativePath)
    } else if (content.includes('requireUser')) {
      authPatterns['requireUser'].files.push(relativePath)
    } else if (content.includes('authenticateUser') && content.includes('auth-helpers')) {
      authPatterns['authenticateUser (auth-helpers)'].files.push(relativePath)
    } else if (content.includes('authenticateUser') && content.includes('api-auth')) {
      authPatterns['authenticateUser (api-auth)'].files.push(relativePath)
    } else if (content.includes('createAdminClient')) {
      authPatterns['createAdminClient'].files.push(relativePath)
    }
    
    // Detectar configuración de cliente Supabase
    let clientConfig = 'unknown'
    if (content.includes('createClient(req, res)')) {
      clientConfig = 'createClient(req, res) - con cookies'
    } else if (content.includes('createServerClient')) {
      clientConfig = 'createServerClient directo - sin cookies'
    } else if (content.includes('createAdminClient')) {
      clientConfig = 'createAdminClient - service role'
    }
    
    return {
      file: relativePath,
      authPattern: detectAuthPattern(content),
      clientConfig,
      hasCompanyFiltering: content.includes('company_id') || content.includes('companyId'),
      hasRoleValidation: content.includes('role') && content.includes('includes'),
      hasPermissionValidation: content.includes('permissions') || content.includes('can_')
    }
  } catch (error) {
    console.error(`Error analizando ${filePath}:`, error.message)
    return null
  }
}

function detectAuthPattern(content) {
  if (content.includes('requireCompanyAccess')) return 'requireCompanyAccess'
  if (content.includes('requireRoles')) return 'requireRoles'
  if (content.includes('requireUser')) return 'requireUser'
  if (content.includes('authenticateUser') && content.includes('auth-helpers')) return 'authenticateUser (auth-helpers)'
  if (content.includes('authenticateUser') && content.includes('api-auth')) return 'authenticateUser (api-auth)'
  if (content.includes('createAdminClient')) return 'createAdminClient'
  return 'unknown'
}

// Función para escanear directorio de APIs
function scanApiDirectory(dir) {
  const results = []
  
  function scanDir(currentDir) {
    const files = fs.readdirSync(currentDir)
    
    for (const file of files) {
      const filePath = path.join(currentDir, file)
      const stat = fs.statSync(filePath)
      
      if (stat.isDirectory()) {
        scanDir(filePath)
      } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
        const analysis = analyzeFile(filePath)
        if (analysis) {
          results.push(analysis)
        }
      }
    }
  }
  
  scanDir(dir)
  return results
}

// Función principal
function main() {
  console.log('🔍 Analizando patrones de autenticación en APIs...\n')
  
  const apiDir = path.join(process.cwd(), 'pages', 'api')
  const results = scanApiDirectory(apiDir)
  
  // Agrupar por patrón de autenticación
  const grouped = {}
  results.forEach(result => {
    if (!grouped[result.authPattern]) {
      grouped[result.authPattern] = []
    }
    grouped[result.authPattern].push(result)
  })
  
  // Mostrar resumen por patrón
  console.log('📊 RESUMEN DE PATRONES DE AUTENTICACIÓN:\n')
  
  Object.entries(grouped).forEach(([pattern, files]) => {
    console.log(`🔸 ${pattern}:`)
    console.log(`   Archivos: ${files.length}`)
    console.log(`   Descripción: ${authPatterns[pattern]?.description || 'No documentado'}`)
    console.log(`   Cliente: ${authPatterns[pattern]?.client || 'No documentado'}`)
    console.log(`   Validación: ${authPatterns[pattern]?.validation || 'No documentado'}`)
    console.log(`   Filtrado: ${authPatterns[pattern]?.filtering || 'No documentado'}`)
    console.log('')
  })
  
  // Mostrar archivos problemáticos
  console.log('🚨 ARCHIVOS CON POSIBLES PROBLEMAS:\n')
  
  const problematicFiles = results.filter(result => 
    result.authPattern === 'requireUser' || 
    result.authPattern === 'authenticateUser (auth-helpers)' ||
    result.authPattern === 'createAdminClient' ||
    !result.hasCompanyFiltering
  )
  
  problematicFiles.forEach(result => {
    console.log(`❌ ${result.file}`)
    console.log(`   Patrón: ${result.authPattern}`)
    console.log(`   Cliente: ${result.clientConfig}`)
    console.log(`   Filtrado por empresa: ${result.hasCompanyFiltering ? '✅' : '❌'}`)
    console.log(`   Validación de roles: ${result.hasRoleValidation ? '✅' : '❌'}`)
    console.log(`   Validación de permisos: ${result.hasPermissionValidation ? '✅' : '❌'}`)
    console.log('')
  })
  
  // Recomendaciones
  console.log('💡 RECOMENDACIONES:\n')
  console.log('1. Migrar todos los endpoints a requireCompanyAccess o requireRoles')
  console.log('2. Asegurar que todos usen createClient(req, res) para cookies')
  console.log('3. Implementar filtrado automático por company_id')
  console.log('4. Estandarizar validación de roles y permisos')
  console.log('')
  
  // Mostrar diferencias específicas
  console.log('🔍 DIFERENCIAS CLAVE ENTRE PATRONES:\n')
  
  const employeesApi = results.find(r => r.file.includes('employees/index.ts'))
  const departmentsApi = results.find(r => r.file.includes('departments/index.ts'))
  const payrollApi = results.find(r => r.file.includes('payroll/records.ts'))
  
  console.log('📋 COMPARACIÓN DE APIS PRINCIPALES:')
  console.log('')
  
  if (employeesApi) {
    console.log('✅ EMPLOYEES API (funcionando):')
    console.log(`   Patrón: ${employeesApi.authPattern}`)
    console.log(`   Cliente: ${employeesApi.clientConfig}`)
    console.log(`   Filtrado: ${employeesApi.hasCompanyFiltering ? '✅' : '❌'}`)
    console.log('')
  }
  
  if (departmentsApi) {
    console.log('❌ DEPARTMENTS API (problemas):')
    console.log(`   Patrón: ${departmentsApi.authPattern}`)
    console.log(`   Cliente: ${departmentsApi.clientConfig}`)
    console.log(`   Filtrado: ${departmentsApi.hasCompanyFiltering ? '✅' : '❌'}`)
    console.log('')
  }
  
  if (payrollApi) {
    console.log('❌ PAYROLL API (problemas):')
    console.log(`   Patrón: ${payrollApi.authPattern}`)
    console.log(`   Cliente: ${payrollApi.clientConfig}`)
    console.log(`   Filtrado: ${payrollApi.hasCompanyFiltering ? '✅' : '❌'}`)
    console.log('')
  }
}

// Ejecutar análisis
main()
