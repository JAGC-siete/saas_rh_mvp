#!/usr/bin/env node

/**
 * 🧹 SCRIPT PARA LIMPIAR SECRETOS DE DOCUMENTACIÓN
 * Reemplaza secretos reales con placeholders en archivos de documentación
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

// Patrones de secretos a reemplazar
const secretPatterns = [
  {
    pattern: /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[\w\-\.]+/g,
    replacement: 'your_supabase_jwt_token_here'
  },
  {
    pattern: /d0995764da07555e0057dfc95a1e7155d6f65827dd6805a450bc4a3f590703a5f83d461f2b1865122e768ab888cec6a0bbff0f986ebdef9bea57b075848d0d8d/g,
    replacement: 'your_jwt_secret_here'
  },
  {
    pattern: /67a36d724fe96719ca9dd71d030ced0c3e623a9489567a42ed0e5b9b5a8a017fdf394ba5febcb9fd0e0bc7097fa0ba0d10a4000b7855ceec92cff184ed0cbea3/g,
    replacement: 'your_session_secret_here'
  },
  {
    pattern: /p5duKqOflWx7bBmJ/g,
    replacement: 'your_database_password_here'
  }
];

// Archivos de documentación a limpiar
const docFiles = [
  'CONFIGURACION_VARIABLES_ENTORNO.md',
  'RAILWAY_ENV_SETUP.md',
  'RAILWAY_ENV_CONFIGURED.md',
  'AUDITORIA_INTEGRACION_FRONTEND_BACKEND.md'
];

function cleanFile(filePath) {
  if (!fs.existsSync(filePath)) {
    log(`⚠️  Archivo no encontrado: ${filePath}`, 'yellow');
    return false;
  }

  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let cleaned = false;

    // Aplicar cada patrón de limpieza
    for (const { pattern, replacement } of secretPatterns) {
      if (pattern.test(content)) {
        content = content.replace(pattern, replacement);
        cleaned = true;
      }
    }

    if (cleaned) {
      // Crear backup
      const backupPath = filePath + '.backup.' + Date.now();
      fs.copyFileSync(filePath, backupPath);
      log(`💾 Backup creado: ${backupPath}`, 'green');

      // Escribir contenido limpio
      fs.writeFileSync(filePath, content, 'utf8');
      log(`✅ Secretos limpiados en: ${filePath}`, 'green');
      return true;
    } else {
      log(`ℹ️  No se encontraron secretos en: ${filePath}`, 'blue');
      return false;
    }
  } catch (error) {
    log(`❌ Error procesando ${filePath}: ${error.message}`, 'red');
    return false;
  }
}

function main() {
  log('🧹 LIMPIANDO SECRETOS DE DOCUMENTACIÓN', 'bold');
  log('=' .repeat(50), 'blue');

  let cleanedCount = 0;

  for (const file of docFiles) {
    log(`\n🔍 Procesando: ${file}`, 'blue');
    if (cleanFile(file)) {
      cleanedCount++;
    }
  }

  log('\n📊 RESUMEN:', 'bold');
  log(`✅ ${cleanedCount} archivos limpiados`, 'green');
  log(`📝 ${docFiles.length} archivos procesados`, 'blue');

  if (cleanedCount > 0) {
    log('\n🚀 PRÓXIMOS PASOS:', 'bold');
    log('1. Verificar que los cambios son correctos', 'blue');
    log('2. Commit de los cambios', 'blue');
    log('3. Push a repositorio', 'blue');
  }

  log('\n🎉 ¡Limpieza completada!', 'bold');
}

if (require.main === module) {
  main();
}

module.exports = { cleanFile, secretPatterns }; 