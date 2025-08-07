#!/usr/bin/env node

const { config } = require('dotenv')
const path = require('path')

// Load environment variables from .env.local
config({ path: path.join(process.cwd(), '.env.local') })

// Required environment variables for Supabase
  'NEXT_PUBLIC_SUPABASE_URL': process.env.NEXT_PUBLIC_SUPABASE_URL,
  'NEXT_PUBLIC_SUPABASE_ANON_KEY': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  'SUPABASE_SERVICE_ROLE_KEY': process.env.SUPABASE_SERVICE_ROLE_KEY,
}

// Optional but recommended variables
const optionalVars = {
  'NODE_ENV': process.env.NODE_ENV || 'development',
  'PORT': process.env.PORT || '3000',
  'TIMEZONE': process.env.TIMEZONE || 'America/Tegucigalpa',
  'LOCALE': process.env.LOCALE || 'es-HN',
}

console.log('🔍 Verificando variables de entorno para Supabase...\n')

let hasErrors = false

// Check required variables
console.log('📋 Variables requeridas:')
for (const [key, value] of Object.entries(requiredVars)) {
  if (!value) {
    console.log(`❌ ${key}: NO_DEFINIDA`)
    hasErrors = true
  } else {
    console.log(`✅ ${key}: DEFINIDA`)
  }
}

console.log('\n📋 Variables opcionales:')
for (const [key, value] of Object.entries(optionalVars)) {
  console.log(`✅ ${key}: ${value}`)
}

if (hasErrors) {
  console.log('\n❌ ERROR: Faltan variables de entorno requeridas.')
  console.log('Por favor, verifica tu archivo .env.local y asegúrate de que todas las variables estén definidas.')
  process.exit(1)
} else {
  console.log('\n✅ Todas las variables de entorno están correctamente configuradas.')
  console.log('El sistema está listo para funcionar con autenticación nativa de Supabase.')
} 