#!/usr/bin/env node

/**
 * Script para verificar todos los endpoints y rutas de la landing page
 */

import fs from 'fs'
import path from 'path'

// Rutas identificadas en landing.tsx
const ROUTES_FROM_LANDING = [
  '/demo',           // Demo/solicitar prueba
  '/login',          // Iniciar sesión  
  '/activar',        // Formulario de activación
  // Fragmentos internos (no rutas):
  // '#certificacion', '#libro-rojo', '#planillero', '#pricing'
]

// API endpoints identificados
const API_ENDPOINTS = [
  '/api/activar',    // POST - Formulario de activación
]

async function verifyRoutes() {
  console.log('🔍 VERIFICANDO RUTAS Y ENDPOINTS DE LA LANDING PAGE')
  console.log('=' .repeat(60))

  console.log('\n📄 PÁGINAS IDENTIFICADAS:')
  
  const pagesDir = 'pages'
  const issues = []

  for (const route of ROUTES_FROM_LANDING) {
    const routePath = route.substring(1) // Remover '/'
    const possibleFiles = [
      path.join(pagesDir, `${routePath}.tsx`),
      path.join(pagesDir, `${routePath}.ts`),
      path.join(pagesDir, `${routePath}.js`),
      path.join(pagesDir, routePath, 'index.tsx'),
      path.join(pagesDir, routePath, 'index.ts'),
      path.join(pagesDir, routePath, 'index.js'),
    ]

    let fileExists = false
    let foundFile = ''

    for (const filePath of possibleFiles) {
      if (fs.existsSync(filePath)) {
        fileExists = true
        foundFile = filePath
        break
      }
    }

    if (fileExists) {
      console.log(`✅ ${route} → ${foundFile}`)
    } else {
      console.log(`❌ ${route} → NO ENCONTRADO`)
      issues.push({
        type: 'missing_page',
        route: route,
        expectedFiles: possibleFiles
      })
    }
  }

  console.log('\n🔌 API ENDPOINTS IDENTIFICADOS:')
  
  for (const endpoint of API_ENDPOINTS) {
    const apiPath = endpoint.replace('/api/', '')
    const possibleFiles = [
      path.join(pagesDir, 'api', `${apiPath}.ts`),
      path.join(pagesDir, 'api', `${apiPath}.js`),
      path.join(pagesDir, 'api', apiPath, 'index.ts'),
      path.join(pagesDir, 'api', apiPath, 'index.js'),
    ]

    let fileExists = false
    let foundFile = ''

    for (const filePath of possibleFiles) {
      if (fs.existsSync(filePath)) {
        fileExists = true
        foundFile = filePath
        break
      }
    }

    if (fileExists) {
      console.log(`✅ ${endpoint} → ${foundFile}`)
    } else {
      console.log(`❌ ${endpoint} → NO ENCONTRADO`)
      issues.push({
        type: 'missing_api',
        endpoint: endpoint,
        expectedFiles: possibleFiles
      })
    }
  }

  // Verificar contenido de archivos existentes
  console.log('\n📋 ANALIZANDO CONTENIDO DE PÁGINAS:')
  await analyzePageContents()

  // Resumen
  console.log('\n' + '='.repeat(60))
  if (issues.length === 0) {
    console.log('🎉 TODAS LAS RUTAS ESTÁN CORRECTAMENTE IMPLEMENTADAS')
  } else {
    console.log('⚠️ PROBLEMAS ENCONTRADOS:')
    issues.forEach(issue => {
      if (issue.type === 'missing_page') {
        console.log(`❌ Página faltante: ${issue.route}`)
        console.log(`   Crear uno de estos archivos:`)
        issue.expectedFiles.slice(0,2).forEach(f => console.log(`   - ${f}`))
      } else if (issue.type === 'missing_api') {
        console.log(`❌ API faltante: ${issue.endpoint}`)
        console.log(`   Crear: ${issue.expectedFiles[0]}`)
      }
      console.log('')
    })
  }
  console.log('='.repeat(60))

  return issues.length === 0
}

async function analyzePageContents() {
  const pagesToAnalyze = [
    { route: '/demo', file: 'pages/demo.tsx' },
    { route: '/login', file: 'pages/login.tsx' },
    { route: '/activar', file: 'pages/activar.tsx' },
    { route: '/api/activar', file: 'pages/api/activar.ts' },
  ]

  for (const page of pagesToAnalyze) {
    if (fs.existsSync(page.file)) {
      const content = fs.readFileSync(page.file, 'utf8')
      const lines = content.split('\n').length
      const hasExport = content.includes('export default') || content.includes('export {')
      const hasReact = content.includes('import') && content.includes('React')
      
      console.log(`📄 ${page.route}:`)
      console.log(`   📁 Archivo: ${page.file}`)
      console.log(`   📏 Líneas: ${lines}`)
      console.log(`   ✅ Export: ${hasExport ? 'Sí' : 'No'}`)
      
      if (page.route.startsWith('/api/')) {
        console.log(`   🔌 Es API endpoint`)
      } else {
        console.log(`   ⚛️ Componente React: ${hasReact ? 'Sí' : 'No'}`)
      }

      // Análisis específico por tipo de página
      if (page.route === '/demo') {
        const hasForm = content.includes('form') || content.includes('Form')
        console.log(`   📝 Tiene formulario: ${hasForm ? 'Sí' : 'No'}`)
      } else if (page.route === '/login') {
        const hasAuth = content.includes('auth') || content.includes('login') || content.includes('signin')
        console.log(`   🔐 Lógica de auth: ${hasAuth ? 'Sí' : 'No'}`)
      } else if (page.route === '/activar') {
        const hasFormData = content.includes('FormData') || content.includes('formData')
        const hasFetch = content.includes('fetch') || content.includes('api/activar')
        console.log(`   📝 Maneja FormData: ${hasFormData ? 'Sí' : 'No'}`)
        console.log(`   🌐 Conecta a API: ${hasFetch ? 'Sí' : 'No'}`)
      } else if (page.route === '/api/activar') {
        const handlesPost = content.includes('POST') || content.includes('req.method')
        const usesSupabase = content.includes('supabase')
        const hasMultiparty = content.includes('multiparty')
        console.log(`   📨 Maneja POST: ${handlesPost ? 'Sí' : 'No'}`)
        console.log(`   🗄️ Usa Supabase: ${usesSupabase ? 'Sí' : 'No'}`)
        console.log(`   📎 Maneja archivos: ${hasMultiparty ? 'Sí' : 'No'}`)
      }
      
      console.log('')
    } else {
      console.log(`❌ ${page.route}: Archivo no encontrado (${page.file})`)
    }
  }
}

// Ejecutar verificación
verifyRoutes()
  .then((success) => {
    process.exit(success ? 0 : 1)
  })
  .catch((error) => {
    console.error('💥 Error:', error.message)
    process.exit(1)
  })
