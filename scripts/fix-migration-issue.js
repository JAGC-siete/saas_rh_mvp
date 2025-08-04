#!/usr/bin/env node

/**
 * Script para corregir el problema específico de la migración de Supabase
 * Error: column user_profiles.user_id does not exist
 */

const fs = require('fs');
const path = require('path');

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

function fixMigrationFile() {
  log('🔧 CORRIGIENDO PROBLEMA DE MIGRACIÓN SUPABASE', 'cyan');
  log('='.repeat(50), 'cyan');

  const migrationFile = path.join(__dirname, '..', 'supabase', 'migrations', '20250723000004_logging_and_jobs_system.sql');
  
  if (!fs.existsSync(migrationFile)) {
    log(`❌ Archivo de migración no encontrado: ${migrationFile}`, 'red');
    return false;
  }

  log(`📁 Archivo encontrado: ${migrationFile}`, 'green');

  // Leer contenido actual
  let content = fs.readFileSync(migrationFile, 'utf8');
  const originalContent = content;

  // Contar ocurrencias del problema
  const problematicPattern = /user_profiles\.user_id/g;
  const matches = content.match(problematicPattern);
  
  if (!matches) {
    log('✅ No se encontraron problemas en la migración', 'green');
    return true;
  }

  log(`🔍 Encontradas ${matches.length} referencias problemáticas`, 'yellow');

  // Crear backup
  const backupFile = migrationFile + `.backup.${Date.now()}`;
  fs.writeFileSync(backupFile, originalContent);
  log(`💾 Backup creado: ${backupFile}`, 'green');

  // Aplicar correcciones
  const fixes = [
    {
      pattern: /user_profiles\.user_id/g,
      replacement: 'user_profiles.id',
      description: 'Cambiar user_id por id'
    },
    {
      pattern: /WHERE user_profiles\.user_id = auth\.uid\(\)/g,
      replacement: 'WHERE user_profiles.id = auth.uid()',
      description: 'Corregir condición WHERE'
    }
  ];

  let fixed = false;
  for (const fix of fixes) {
    if (content.match(fix.pattern)) {
      content = content.replace(fix.pattern, fix.replacement);
      log(`✅ ${fix.description}`, 'green');
      fixed = true;
    }
  }

  if (fixed) {
    // Escribir archivo corregido
    fs.writeFileSync(migrationFile, content);
    log(`✅ Migración corregida exitosamente`, 'green');
    
    // Mostrar diferencias
    log('\n📋 CAMBIOS APLICADOS:', 'yellow');
    const originalLines = originalContent.split('\n');
    const fixedLines = content.split('\n');
    
    for (let i = 0; i < Math.max(originalLines.length, fixedLines.length); i++) {
      if (originalLines[i] !== fixedLines[i]) {
        if (originalLines[i]) {
          log(`- ${originalLines[i]}`, 'red');
        }
        if (fixedLines[i]) {
          log(`+ ${fixedLines[i]}`, 'green');
        }
      }
    }
    
    return true;
  } else {
    log('⚠️  No se aplicaron correcciones', 'yellow');
    return false;
  }
}

function createQuickFixScript() {
  log('\n📝 CREANDO SCRIPT DE CORRECCIÓN RÁPIDA', 'yellow');
  
  const quickFixScript = `#!/usr/bin/env node

/**
 * Script de corrección rápida para Supabase
 * Ejecutar después de corregir la migración
 */

const { execSync } = require('child_process');

console.log('🚀 Aplicando correcciones a Supabase...');

try {
  // Resetear migraciones
  console.log('🔄 Reseteando migraciones...');
  execSync('supabase db reset', { stdio: 'inherit' });
  
  // Aplicar migraciones corregidas
  console.log('📦 Aplicando migraciones...');
  execSync('supabase db push', { stdio: 'inherit' });
  
  console.log('✅ Corrección completada exitosamente');
  
} catch (error) {
  console.error('❌ Error durante la corrección:', error.message);
  process.exit(1);
}
`;

  const scriptPath = path.join(__dirname, 'quick-fix-supabase.js');
  fs.writeFileSync(scriptPath, quickFixScript);
  fs.chmodSync(scriptPath, '755');
  
  log(`✅ Script de corrección rápida creado: ${scriptPath}`, 'green');
  return scriptPath;
}

function main() {
  try {
    // 1. Corregir archivo de migración
    const migrationFixed = fixMigrationFile();
    
    if (migrationFixed) {
      // 2. Crear script de corrección rápida
      createQuickFixScript();
      
      log('\n🎉 CORRECCIÓN COMPLETADA', 'green');
      log('='.repeat(50), 'green');
      log('Próximos pasos:', 'cyan');
      log('1. Ejecutar: node scripts/quick-fix-supabase.js', 'yellow');
      log('2. O manualmente:', 'yellow');
      log('   - supabase db reset', 'yellow');
      log('   - supabase db push', 'yellow');
      log('3. Verificar que supabase db pull funcione', 'yellow');
    } else {
      log('\n❌ No se pudo completar la corrección', 'red');
      process.exit(1);
    }
    
  } catch (error) {
    log(`❌ Error fatal: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main();
}

module.exports = { fixMigrationFile, createQuickFixScript }; 