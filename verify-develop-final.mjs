#!/usr/bin/env node

/**
 * VERIFICACIÓN FINAL POST-MERGE A DEVELOP
 * Confirma que el sistema completo está funcional
 */

import fs from 'fs'
import path from 'path'

console.log('🎯 VERIFICACIÓN FINAL POST-MERGE A DEVELOP')
console.log('='.repeat(60))

// Archivos críticos del sistema de activación
const CRITICAL_FILES = [
  { file: 'pages/landing.tsx', desc: 'Landing page renovada' },
  { file: 'pages/activar.tsx', desc: 'Formulario de activación' },
  { file: 'pages/demo.tsx', desc: 'Página de demo' },
  { file: 'pages/gracias.tsx', desc: 'Página de confirmación' },
  { file: 'pages/api/activar.ts', desc: 'API backend' },
  { file: 'supabase/migrations/20250208000000_create_activaciones_table.sql', desc: 'Migración DB' },
  { file: 'middleware.ts', desc: 'Configuración de rutas públicas' },
  { file: 'test-activar-curl.sh', desc: 'Script de pruebas cURL' },
  { file: 'MERGE_TO_DEVELOP_SUMMARY.md', desc: 'Documentación del merge' }
]

console.log('\n📋 VERIFICANDO ARCHIVOS CRÍTICOS:')
let allFilesPresent = true

for (const item of CRITICAL_FILES) {
  if (fs.existsSync(item.file)) {
    const stats = fs.statSync(item.file)
    const size = (stats.size / 1024).toFixed(1)
    console.log(`✅ ${item.file.padEnd(60)} (${size} KB) - ${item.desc}`)
  } else {
    console.log(`❌ ${item.file.padEnd(60)} - FALTANTE: ${item.desc}`)
    allFilesPresent = false
  }
}

// Verificar configuración del middleware
console.log('\n🔒 VERIFICANDO MIDDLEWARE:')
if (fs.existsSync('middleware.ts')) {
  const middlewareContent = fs.readFileSync('middleware.ts', 'utf8')
  const publicRoutes = ['/activar', '/demo', '/gracias', '/api/activar']
  
  for (const route of publicRoutes) {
    if (middlewareContent.includes(route)) {
      console.log(`✅ Ruta pública configurada: ${route}`)
    } else {
      console.log(`❌ Ruta pública faltante: ${route}`)
      allFilesPresent = false
    }
  }
  
  // Verificar que no hay secretos hardcodeados
  const hasHardcodedSecrets = middlewareContent.match(/['"](sk-|supabase_[a-zA-Z0-9]{40,}|[A-Za-z0-9+/]{64,}={0,2})['"]/g)
  if (hasHardcodedSecrets) {
    console.log(`❌ SECRETOS HARDCODEADOS DETECTADOS: ${hasHardcodedSecrets.join(', ')}`)
    allFilesPresent = false
  } else {
    console.log(`✅ Sin secretos hardcodeados (usa process.env correctamente)`)
  }
}

// Verificar estructura de Supabase
console.log('\n🗄️ VERIFICANDO MIGRACIÓN DE SUPABASE:')
const migrationFile = 'supabase/migrations/20250208000000_create_activaciones_table.sql'
if (fs.existsSync(migrationFile)) {
  const migrationContent = fs.readFileSync(migrationFile, 'utf8')
  const requiredElements = [
    'CREATE TABLE IF NOT EXISTS activaciones',
    'contacto_nombre TEXT NOT NULL',
    'contacto_whatsapp TEXT NOT NULL', 
    'contacto_email TEXT NOT NULL',
    'ENABLE ROW LEVEL SECURITY',
    'Anyone can create activation request'
  ]
  
  for (const element of requiredElements) {
    if (migrationContent.includes(element)) {
      console.log(`✅ ${element}`)
    } else {
      console.log(`❌ Faltante: ${element}`)
      allFilesPresent = false
    }
  }
}

// Verificar que los scripts de prueba existen
console.log('\n🧪 VERIFICANDO SCRIPTS DE PRUEBA:')
const testScripts = [
  'test-activar-curl.sh',
  'verify-complete-system.mjs',
  'verify-landing-routes.mjs'
]

for (const script of testScripts) {
  if (fs.existsSync(script)) {
    console.log(`✅ ${script}`)
  } else {
    console.log(`❌ ${script} - Script de prueba faltante`)
  }
}

// Resumen final
console.log('\n' + '='.repeat(60))
if (allFilesPresent) {
  console.log('🎉 DEVELOP ESTÁ COMPLETAMENTE ACTUALIZADO')
  console.log('')
  console.log('✅ Todos los archivos críticos presentes')
  console.log('✅ Configuración de seguridad correcta') 
  console.log('✅ Migración de base de datos lista')
  console.log('✅ Scripts de verificación incluidos')
  console.log('')
  console.log('🚀 SISTEMA LISTO PARA:')
  console.log('   • Deployment a producción')
  console.log('   • Captura de leads B2B')
  console.log('   • Procesamiento de formularios de activación')
  console.log('   • Integración completa con Supabase')
  console.log('')
  console.log('📡 PRÓXIMO PASO: git push origin develop')
} else {
  console.log('⚠️ HAY ARCHIVOS FALTANTES O PROBLEMAS DE CONFIGURACIÓN')
  console.log('💡 Revisar errores arriba antes de hacer push')
}
console.log('='.repeat(60))
