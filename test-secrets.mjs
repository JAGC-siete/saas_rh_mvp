#!/usr/bin/env node

/**
 * Script para verificar que todas las variables de entorno estén funcionando
 * Ejecutar: node test-secrets.mjs
 */

import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Cargar variables de entorno
dotenv.config()

console.log('🔍 VERIFICANDO VARIABLES DE ENTORNO...\n')

// Lista de variables requeridas
const requiredVars = {
  // Supabase
  'NEXT_PUBLIC_SUPABASE_URL': 'URL de Supabase',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY': 'Clave anónima de Supabase',
  'SUPABASE_SERVICE_ROLE_KEY': 'Clave de servicio de Supabase',
  
  // Database
  'DATABASE_URL': 'URL de la base de datos',
  
  // Security
  'JWT_SECRET': 'Secreto JWT',
  'SUPABASE_JWT_SECRET': 'Secreto JWT de Supabase',
  'SESSION_SECRET': 'Secreto de sesión',
  
  // App Config
  'NEXT_TELEMETRY_DISABLED': 'Telemetría deshabilitada',
  'SKIP_ENV_VALIDATION': 'Saltar validación de env',
  'BASES_DE_DATOS_URL': 'URL de bases de datos',
  'DEFAULT_CURRENCY': 'Moneda por defecto',
  'DEFAULT_TIMEZONE': 'Zona horaria por defecto',
  'TZ': 'Zona horaria del sistema',
  
  // Node.js
  'NODE_ENV': 'Entorno de Node.js',
  'PORT': 'Puerto de la aplicación',
  'HOSTNAME': 'Hostname de la aplicación',
  
  // Site & Domain
  'NEXT_PUBLIC_SITE_URL': 'URL del sitio',
  'RAILWAY_PUBLIC_DOMAIN': 'Dominio de Railway',
  
  // Cron
  'CRON_SECRET': 'Secreto para cron jobs'
}

// Verificar variables
let allGood = true
const results = {}

for (const [varName, description] of Object.entries(requiredVars)) {
  const value = process.env[varName]
  const exists = !!value
  const masked = exists ? `${value.substring(0, 8)}...` : '❌ NO ENCONTRADA'
  
  results[varName] = { exists, value: masked, description }
  
  if (!exists) {
    allGood = false
  }
}

// Mostrar resultados
console.log('📋 ESTADO DE LAS VARIABLES:\n')

Object.entries(results).forEach(([varName, { exists, value, description }]) => {
  const status = exists ? '✅' : '❌'
  console.log(`${status} ${varName}: ${value}`)
  if (!exists) {
    console.log(`   Descripción: ${description}`)
  }
})

console.log('\n' + '='.repeat(50))

// Test de conexión a Supabase
if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.log('\n🧪 PROBANDO CONEXIÓN A SUPABASE...')
  
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    
    // Test simple de conexión
    const { data, error } = await supabase.from('user_profiles').select('count').limit(1)
    
    if (error) {
      console.log('❌ Error conectando a Supabase:', error.message)
    } else {
      console.log('✅ Conexión a Supabase exitosa')
    }
  } catch (error) {
    console.log('❌ Error inesperado:', error.message)
  }
}

// Resumen final
console.log('\n' + '='.repeat(50))
if (allGood) {
  console.log('🎉 ¡TODAS LAS VARIABLES ESTÁN CONFIGURADAS!')
  console.log('✅ Tu aplicación debería funcionar correctamente')
} else {
  console.log('⚠️  ALGUNAS VARIABLES FALTAN')
  console.log('🔧 Revisa la configuración antes de continuar')
}

console.log('\n📝 Para configurar en Railway:')
console.log('railway variables set NOMBRE_VARIABLE=valor')
console.log('\n📝 Para configurar en GitHub Secrets:')
console.log('Settings → Secrets and variables → Actions → New repository secret')
