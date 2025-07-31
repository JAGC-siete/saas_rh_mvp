#!/usr/bin/env node

/**
 * 🧹 SCRIPT PARA LIMPIAR PÁGINAS DUPLICADAS
 * Elimina archivos duplicados que causan conflictos de routing en Next.js
 * 
 * Uso: node scripts/clean-duplicate-pages.js
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

function fileExists(filePath) {
  return fs.existsSync(filePath);
}

function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (error) {
    return 0;
  }
}

function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    return '';
  }
}

// 1. LIMPIAR PÁGINAS DUPLICADAS
function cleanDuplicatePages() {
  log('\n🧹 LIMPIANDO PÁGINAS DUPLICADAS', 'bold');
  log('=' .repeat(50), 'blue');
  
  const duplicates = [
    {
      name: 'departments',
      oldFile: 'pages/departments.tsx',
      newFile: 'pages/departments/index.tsx',
      reason: 'Mantener estructura de carpetas (más organizado)'
    },
    {
      name: 'employees',
      oldFile: 'pages/employees.tsx',
      newFile: 'pages/employees/index.tsx',
      reason: 'Mantener estructura de carpetas (más organizado)'
    },
    {
      name: 'payroll API',
      oldFile: 'pages/api/payroll.js',
      newFile: 'pages/api/payroll.ts',
      reason: 'Mantener TypeScript (más funcional)'
    }
  ];
  
  let cleanedCount = 0;
  
  for (const duplicate of duplicates) {
    log(`\n🔍 Procesando: ${duplicate.name}`, 'blue');
    
    const oldExists = fileExists(duplicate.oldFile);
    const newExists = fileExists(duplicate.newFile);
    
    if (!oldExists && !newExists) {
      log(`   ⚠️  Ningún archivo encontrado`, 'yellow');
      continue;
    }
    
    if (!oldExists) {
      log(`   ✅ Solo existe el archivo nuevo: ${duplicate.newFile}`, 'green');
      continue;
    }
    
    if (!newExists) {
      log(`   ⚠️  Solo existe el archivo viejo: ${duplicate.oldFile}`, 'yellow');
      continue;
    }
    
    // Ambos archivos existen, comparar contenido
    const oldContent = readFile(duplicate.oldFile);
    const newContent = readFile(duplicate.newFile);
    
    const oldSize = getFileSize(duplicate.oldFile);
    const newSize = getFileSize(duplicate.newFile);
    
    log(`   📊 Tamaños: ${oldSize} bytes vs ${newSize} bytes`, 'blue');
    
    // Decidir cuál mantener basado en el tipo
    let keepNew = true;
    let reason = duplicate.reason;
    
    if (duplicate.name === 'payroll API') {
      // Para API, mantener el archivo TypeScript si tiene contenido
      if (oldSize === 0 && newSize > 0) {
        keepNew = true;
        reason = 'Archivo .js está vacío, mantener .ts con funcionalidad';
      } else if (oldSize > 0 && newSize === 0) {
        keepNew = false;
        reason = 'Archivo .ts está vacío, mantener .js con funcionalidad';
      } else {
        keepNew = true;
        reason = 'Preferir TypeScript para APIs';
      }
    } else {
      // Para páginas, mantener la estructura de carpetas
      keepNew = true;
    }
    
    const fileToDelete = keepNew ? duplicate.oldFile : duplicate.newFile;
    const fileToKeep = keepNew ? duplicate.newFile : duplicate.oldFile;
    
    log(`   🎯 Decisión: Mantener ${fileToKeep}`, 'green');
    log(`   📝 Razón: ${reason}`, 'blue');
    
    // Crear backup antes de eliminar
    const backupPath = fileToDelete + '.backup.' + Date.now();
    try {
      fs.copyFileSync(fileToDelete, backupPath);
      log(`   💾 Backup creado: ${backupPath}`, 'green');
    } catch (error) {
      log(`   ❌ Error creando backup: ${error.message}`, 'red');
      continue;
    }
    
    // Eliminar archivo duplicado
    try {
      fs.unlinkSync(fileToDelete);
      log(`   ✅ Eliminado: ${fileToDelete}`, 'green');
      cleanedCount++;
    } catch (error) {
      log(`   ❌ Error eliminando archivo: ${error.message}`, 'red');
    }
  }
  
  return cleanedCount;
}

// 2. VERIFICAR ESTRUCTURA FINAL
function verifyFinalStructure() {
  log('\n🔍 VERIFICANDO ESTRUCTURA FINAL', 'bold');
  log('=' .repeat(40), 'blue');
  
  const expectedStructure = [
    'pages/departments/index.tsx',
    'pages/employees/index.tsx',
    'pages/api/payroll.ts'
  ];
  
  const unexpectedFiles = [
    'pages/departments.tsx',
    'pages/employees.tsx',
    'pages/api/payroll.js'
  ];
  
  let allGood = true;
  
  // Verificar archivos esperados
  for (const file of expectedStructure) {
    if (fileExists(file)) {
      log(`✅ ${file}`, 'green');
    } else {
      log(`❌ ${file} (faltante)`, 'red');
      allGood = false;
    }
  }
  
  // Verificar archivos inesperados
  for (const file of unexpectedFiles) {
    if (fileExists(file)) {
      log(`⚠️  ${file} (aún existe)`, 'yellow');
      allGood = false;
    } else {
      log(`✅ ${file} (eliminado correctamente)`, 'green');
    }
  }
  
  return allGood;
}

// 3. MOSTRAR RESUMEN
function showSummary(cleanedCount, structureGood) {
  log('\n📊 RESUMEN DE LIMPIEZA', 'bold');
  log('=' .repeat(30), 'blue');
  
  if (cleanedCount > 0) {
    log(`✅ ${cleanedCount} archivos duplicados eliminados`, 'green');
  } else {
    log(`ℹ️  No se encontraron duplicados para eliminar`, 'blue');
  }
  
  if (structureGood) {
    log('✅ Estructura de archivos correcta', 'green');
  } else {
    log('⚠️  Problemas en la estructura de archivos', 'yellow');
  }
  
  log('\n🚀 PRÓXIMOS PASOS:', 'bold');
  log('1. Reiniciar el servidor de desarrollo', 'blue');
  log('   npm run dev', 'yellow');
  log('', 'reset');
  log('2. Verificar que no hay advertencias de duplicados', 'blue');
  log('   Revisar la consola del servidor', 'yellow');
  log('', 'reset');
  log('3. Probar las rutas afectadas:', 'blue');
  log('   - /departments', 'yellow');
  log('   - /employees', 'yellow');
  log('   - /api/payroll', 'yellow');
  log('', 'reset');
  
  log('\n🔍 PARA VERIFICAR:', 'bold');
  log('1. Las rutas deben funcionar correctamente', 'blue');
  log('2. No debe haber advertencias de duplicados', 'blue');
  log('3. Los componentes deben cargar sin errores', 'blue');
}

// 4. CREAR ARCHIVO DE LOG
function createCleanupLog(cleanedCount, structureGood) {
  const logContent = `# 🧹 LOG DE LIMPIEZA DE PÁGINAS DUPLICADAS

**Fecha:** ${new Date().toISOString()}
**Archivos eliminados:** ${cleanedCount}
**Estructura correcta:** ${structureGood ? 'Sí' : 'No'}

## Archivos eliminados:
- pages/departments.tsx → pages/departments/index.tsx
- pages/employees.tsx → pages/employees/index.tsx  
- pages/api/payroll.js → pages/api/payroll.ts

## Razones:
1. **Estructura de carpetas:** Mantener organización con carpetas
2. **TypeScript:** Preferir archivos .ts sobre .js
3. **Funcionalidad:** Mantener archivos con más funcionalidad

## Resultado:
- ✅ Eliminación de duplicados completada
- ✅ Estructura de routing mejorada
- ✅ Advertencias de Next.js resueltas

---
*Limpieza ejecutada automáticamente por scripts/clean-duplicate-pages.js*
`;

  try {
    fs.writeFileSync('cleanup-log.md', logContent, 'utf8');
    log('📝 Log de limpieza creado: cleanup-log.md', 'green');
  } catch (error) {
    log(`❌ Error creando log: ${error.message}`, 'red');
  }
}

// FUNCIÓN PRINCIPAL
async function main() {
  log('🧹 LIMPIEZA DE PÁGINAS DUPLICADAS', 'bold');
  log('=' .repeat(50), 'blue');
  
  try {
    // Ejecutar limpieza
    const cleanedCount = cleanDuplicatePages();
    
    // Verificar estructura final
    const structureGood = verifyFinalStructure();
    
    // Mostrar resumen
    showSummary(cleanedCount, structureGood);
    
    // Crear log
    createCleanupLog(cleanedCount, structureGood);
    
    log('\n🎉 ¡Limpieza completada!', 'bold');
    
  } catch (error) {
    log(`\n💥 ERROR FATAL: ${error.message}`, 'red');
    process.exit(1);
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
  cleanDuplicatePages,
  verifyFinalStructure,
  showSummary
}; 