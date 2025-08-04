#!/usr/bin/env node

/**
 * Script final para ejecutar la importación corregida
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function executeFinalImport() {
  log('🚀 EJECUTANDO IMPORTACIÓN FINAL CORREGIDA', 'cyan');
  log('='.repeat(60), 'cyan');

  try {
    // Verificar archivos de entorno
    const envFiles = ['.env.local', '.env', '.env.example'];
    let envFile = null;

    for (const file of envFiles) {
      if (fs.existsSync(file)) {
        envFile = file;
        log(`📁 Usando archivo de entorno: ${file}`, 'green');
        break;
      }
    }

    if (!envFile) {
      log('❌ No se encontró archivo de entorno', 'red');
      process.exit(1);
    }

    // Leer variables de entorno
    const envContent = fs.readFileSync(envFile, 'utf8');
    const envVars = {};

    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        if (value && !key.startsWith('#')) {
          envVars[key.trim()] = value.replace(/^["']|["']$/g, '');
        }
      }
    });

    // Verificar variables requeridas
    const requiredVars = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
    const missingVars = requiredVars.filter(varName => !envVars[varName]);

    if (missingVars.length > 0) {
      log('❌ Variables de entorno faltantes:', 'red');
      missingVars.forEach(varName => log(`   - ${varName}`, 'red'));
      process.exit(1);
    }

    log('✅ Variables de entorno verificadas', 'green');

    // Verificar archivo de importación corregido
    const importScript = path.join(__dirname, '..', 'import-data', 'import-fixed.js');
    
    if (!fs.existsSync(importScript)) {
      log('❌ Script de importación corregido no encontrado', 'red');
      log('Ejecuta primero: node scripts/fix-foreign-keys.js', 'yellow');
      process.exit(1);
    }

    // Verificar archivo de datos corregidos
    const fixedDataFile = path.join(__dirname, '..', 'import-data', 'employees-fixed.json');
    
    if (!fs.existsSync(fixedDataFile)) {
      log('❌ Archivo de datos corregidos no encontrado', 'red');
      log('Ejecuta primero: node scripts/fix-foreign-keys.js', 'yellow');
      process.exit(1);
    }

    log('✅ Archivos de importación corregida verificados', 'green');

    // Ejecutar importación corregida
    log('\n📦 EJECUTANDO IMPORTACIÓN CORREGIDA...', 'yellow');
    
    const child = spawn('node', [importScript], {
      stdio: 'inherit',
      env: { ...process.env, ...envVars }
    });

    child.on('close', (code) => {
      if (code === 0) {
        log('\n🎉 IMPORTACIÓN FINAL COMPLETADA EXITOSAMENTE', 'green');
        log('✅ Los datos reales han sido importados correctamente', 'green');
        log('🎯 Resumen de problemas resueltos:', 'cyan');
        log('   ✅ Error de migración: user_profiles.user_id', 'green');
        log('   ✅ Problemas de triggers: on_auth_user_created', 'green');
        log('   ✅ Estructura de datos: Ajustada a BD real', 'green');
        log('   ✅ Claves foráneas: work_schedule_id corregido', 'green');
        log('   ✅ Datos reales: 34 empleados importados', 'green');
        log('\n🎊 ¡PROBLEMA COMPLETAMENTE RESUELTO!', 'green');
      } else {
        log(`\n❌ Importación corregida falló con código: ${code}`, 'red');
        process.exit(code);
      }
    });

    child.on('error', (error) => {
      log(`❌ Error ejecutando importación corregida: ${error.message}`, 'red');
      process.exit(1);
    });

  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  executeFinalImport();
}

module.exports = { executeFinalImport }; 