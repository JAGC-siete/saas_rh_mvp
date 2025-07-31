#!/usr/bin/env node

/**
 * 🔍 SCRIPT DE VERIFICACIÓN RÁPIDA DE VARIABLES DE ENTORNO
 * Verifica que todas las variables necesarias estén configuradas
 * 
 * Uso: node scripts/check-env-vars.js
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

function checkEnvVariables() {
  log('🔍 VERIFICACIÓN RÁPIDA DE VARIABLES DE ENTORNO', 'bold');
  log('=' .repeat(50), 'blue');
  
  // Cargar variables de entorno
  require('dotenv').config({ path: '.env.local' });
  
  const requiredVars = {
    // Supabase (críticas)
    'NEXT_PUBLIC_SUPABASE_URL': {
      required: true,
      description: 'URL de Supabase',
      example: 'https://fwyxmovfrzauebiqxchz.supabase.co'
    },
    'NEXT_PUBLIC_SUPABASE_ANON_KEY': {
      required: true,
      description: 'Clave anónima de Supabase',
      example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
    },
    'SUPABASE_SERVICE_ROLE_KEY': {
      required: true,
      description: 'Clave de servicio de Supabase',
      example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
    },
    
    // JWT y Sesiones (críticas)
    'JWT_SECRET': {
      required: true,
      description: 'Clave secreta para JWT',
      example: 'tu_jwt_secret_unico_y_seguro_aqui'
    },
    'SESSION_SECRET': {
      required: true,
      description: 'Clave secreta para sesiones',
      example: 'tu_session_secret_unico_y_seguro_aqui'
    },
    
    // Configuración del sitio (importantes)
    'NEXT_PUBLIC_SITE_URL': {
      required: true,
      description: 'URL del sitio',
      example: 'https://humanosisu.net'
    },
    'DATABASE_URL': {
      required: true,
      description: 'URL de conexión a la base de datos',
      example: 'postgresql://postgres:password@host:port/database'
    },
    
    // Entorno (importantes)
    'NODE_ENV': {
      required: false,
      description: 'Entorno de ejecución',
      example: 'development',
      default: 'development'
    },
    'PORT': {
      required: false,
      description: 'Puerto del servidor',
      example: '3000',
      default: '3000'
    }
  };
  
  let allPresent = true;
  let criticalMissing = 0;
  
  log('\n📊 ESTADO DE LAS VARIABLES:', 'bold');
  
  for (const [varName, config] of Object.entries(requiredVars)) {
    const value = process.env[varName];
    
    if (value) {
      // Verificar si es un valor por defecto o placeholder
      if (value.includes('your-secret') || value.includes('tu_') || value.includes('placeholder')) {
        log(`⚠️  ${varName}: Configurada pero con valor por defecto`, 'yellow');
        log(`   Descripción: ${config.description}`, 'blue');
        log(`   Valor actual: ${value.substring(0, 20)}...`, 'yellow');
        log(`   Recomendación: Cambiar por un valor único y seguro`, 'yellow');
      } else {
        log(`✅ ${varName}: Configurada correctamente`, 'green');
        log(`   Descripción: ${config.description}`, 'blue');
        log(`   Valor: ${value.substring(0, 30)}...`, 'green');
      }
    } else if (config.required) {
      log(`❌ ${varName}: FALTANTE (CRÍTICA)`, 'red');
      log(`   Descripción: ${config.description}`, 'blue');
      log(`   Ejemplo: ${config.example}`, 'yellow');
      allPresent = false;
      criticalMissing++;
    } else {
      log(`⚠️  ${varName}: No configurada (usando valor por defecto)`, 'yellow');
      log(`   Descripción: ${config.description}`, 'blue');
      log(`   Valor por defecto: ${config.default}`, 'yellow');
    }
    
    log('', 'reset');
  }
  
  // Resumen
  log('\n📋 RESUMEN:', 'bold');
  log('=' .repeat(30), 'blue');
  
  if (criticalMissing > 0) {
    log(`❌ ${criticalMissing} variables críticas faltantes`, 'red');
    log('🚨 El sistema NO funcionará correctamente', 'red');
  } else if (!allPresent) {
    log('⚠️  Algunas variables tienen valores por defecto', 'yellow');
    log('🔧 El sistema funcionará pero con configuración básica', 'yellow');
  } else {
    log('✅ Todas las variables están configuradas correctamente', 'green');
    log('🎉 El sistema está listo para funcionar', 'green');
  }
  
  return allPresent && criticalMissing === 0;
}

function showQuickFix() {
  log('\n🔧 SOLUCIÓN RÁPIDA:', 'bold');
  log('=' .repeat(30), 'blue');
  
  log('1. Ejecutar el configurador automático:', 'blue');
  log('   node scripts/setup-env.js', 'yellow');
  
  log('\n2. O crear manualmente .env.local con:', 'blue');
  log('   # Supabase Configuration', 'yellow');
  log('   NEXT_PUBLIC_SUPABASE_URL=https://fwyxmovfrzauebiqxchz.supabase.co', 'yellow');
  log('   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3eXhtb3ZmcnphdWViaXF4Y2h6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxODk5MjEsImV4cCI6MjA2Nzc2NTkyMX0.pXArDqHGA4yjprTqJfsNQXwzS-WLz6NCK5QRbLAyYmA', 'yellow');
  log('   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3eXhtb3ZmcnphdWViaXF4Y2h6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjE4OTkyMSwiZXhwIjoyMDY3NzY1OTIxfQ.7tCj7HGw9MevF1Q9EEoOvD6CXf4M6f0iu37U-vjE76I', 'yellow');
  log('   ', 'reset');
  log('   # JWT Configuration', 'yellow');
  log('   JWT_SECRET=tu_jwt_secret_unico_y_seguro_aqui', 'yellow');
  log('   ', 'reset');
  log('   # Site Configuration', 'yellow');
  log('   NEXT_PUBLIC_SITE_URL=https://humanosisu.net', 'yellow');
  log('   ', 'reset');
  log('   # Database Configuration', 'yellow');
  log('   DATABASE_URL=postgresql://postgres:p5duKqOflWx7bBmJ@aws-0-us-east-2.pooler.supabase.com:6543/postgres', 'yellow');
  log('   ', 'reset');
  log('   # Session Configuration', 'yellow');
  log('   SESSION_SECRET=tu_session_secret_unico_y_seguro_aqui', 'yellow');
  log('   ', 'reset');
  log('   # Environment', 'yellow');
  log('   NODE_ENV=development', 'yellow');
  log('   PORT=3000', 'yellow');
}

function testSupabaseConnection() {
  log('\n🔗 PROBANDO CONEXIÓN A SUPABASE:', 'bold');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    log('❌ No se pueden probar las credenciales de Supabase', 'red');
    return false;
  }
  
  log(`✅ URL de Supabase: ${supabaseUrl}`, 'green');
  log(`✅ Clave anónima: ${supabaseKey.substring(0, 30)}...`, 'green');
  log('ℹ️  Para probar la conexión completa, ejecuta: npm run dev', 'blue');
  
  return true;
}

// FUNCIÓN PRINCIPAL
async function main() {
  try {
    // Verificar variables de entorno
    const envOk = checkEnvVariables();
    
    // Probar conexión a Supabase
    testSupabaseConnection();
    
    // Mostrar solución si hay problemas
    if (!envOk) {
      showQuickFix();
    } else {
      log('\n🎉 VERIFICACIÓN COMPLETADA', 'bold');
      log('✅ Todas las variables están configuradas correctamente', 'green');
      log('✅ Puedes ejecutar: npm run dev', 'green');
    }
    
  } catch (error) {
    log(`\n💥 ERROR: ${error.message}`, 'red');
    showQuickFix();
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
  checkEnvVariables,
  testSupabaseConnection
}; 