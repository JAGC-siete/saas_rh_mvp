#!/usr/bin/env node

/**
 * 🇭🇳 SCRIPT PARA CORREGIR TODOS LOS PROBLEMAS DE TIMEZONE
 * 
 * Este script encuentra y corrige automáticamente todos los usos incorrectos
 * de fechas que no usan la zona horaria de Tegucigalpa.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// Patrones problemáticos que necesitan ser corregidos
const PROBLEMATIC_PATTERNS = [
  {
    pattern: /new Date\(\)\.toISOString\(\)/g,
    replacement: "getHondurasTimestamp()",
    import: "getHondurasTimestamp"
  },
  {
    pattern: /new Date\(\)\.toLocaleDateString\('es-HN'\)/g,
    replacement: "formatDateForHonduras(nowInHonduras())",
    import: "formatDateForHonduras, nowInHonduras"
  },
  {
    pattern: /new Date\(\)\.toLocaleDateString\('es-ES'\)/g,
    replacement: "formatDateForHonduras(nowInHonduras())",
    import: "formatDateForHonduras, nowInHonduras"
  },
  {
    pattern: /new Date\(\)\.toLocaleString\('es-HN'\)/g,
    replacement: "formatDateTimeForHonduras(nowInHonduras())",
    import: "formatDateTimeForHonduras, nowInHonduras"
  },
  {
    pattern: /Date\.now\(\)/g,
    replacement: "nowInHonduras().getTime()",
    import: "nowInHonduras"
  },
  {
    pattern: /new Date\(\)(?!\.(toLocaleString|toLocaleDateString|toISOString|getTime))/g,
    replacement: "nowInHonduras()",
    import: "nowInHonduras"
  }
];

// Archivos que deben ser procesados
const TARGET_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];
const TARGET_DIRECTORIES = ['pages/api', 'components', 'lib'];

let totalFilesProcessed = 0;
let totalChanges = 0;

function findFiles(dir, extensions = TARGET_EXTENSIONS) {
  const files = [];
  
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        files.push(...findFiles(fullPath, extensions));
      } else if (stat.isFile() && extensions.some(ext => item.endsWith(ext))) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error.message);
  }
  
  return files;
}

function needsTimezoneImport(content) {
  return !content.includes("from '../../../lib/timezone'") && 
         !content.includes("from '../../lib/timezone'") && 
         !content.includes("from '../lib/timezone'") &&
         !content.includes("from './timezone'");
}

function addTimezoneImport(content, filePath, importsNeeded) {
  if (importsNeeded.length === 0) return content;
  
  // Determinar la ruta relativa correcta para el import
  const relativePath = path.relative(path.dirname(filePath), path.join(projectRoot, 'lib/timezone'));
  const importPath = relativePath.startsWith('.') ? relativePath : `./${relativePath}`;
  
  // Crear el import statement
  const uniqueImports = [...new Set(importsNeeded)];
  const importStatement = `import { ${uniqueImports.join(', ')} } from '${importPath.replace(/\\/g, '/')}'`;
  
  // Buscar el lugar correcto para insertar el import
  const lines = content.split('\n');
  let insertIndex = 0;
  
  // Buscar después de otros imports
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('import ')) {
      insertIndex = i + 1;
    } else if (lines[i].trim() === '' && insertIndex > 0) {
      // Insertar después del último import y línea vacía
      break;
    }
  }
  
  lines.splice(insertIndex, 0, importStatement);
  return lines.join('\n');
}

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let newContent = content;
    let fileChanges = 0;
    let importsNeeded = [];
    
    // Aplicar cada patrón de corrección
    for (const { pattern, replacement, import: importName } of PROBLEMATIC_PATTERNS) {
      const matches = content.match(pattern);
      if (matches) {
        newContent = newContent.replace(pattern, replacement);
        fileChanges += matches.length;
        
        if (importName) {
          importsNeeded.push(...importName.split(', '));
        }
      }
    }
    
    if (fileChanges > 0) {
      // Agregar imports de timezone si es necesario
      if (needsTimezoneImport(content)) {
        newContent = addTimezoneImport(newContent, filePath, importsNeeded);
      }
      
      fs.writeFileSync(filePath, newContent);
      console.log(`✅ Fixed ${fileChanges} timezone issues in ${path.relative(projectRoot, filePath)}`);
      totalChanges += fileChanges;
    }
    
    totalFilesProcessed++;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

function main() {
  console.log('🇭🇳 INICIANDO CORRECCIÓN MASIVA DE TIMEZONE PARA TEGUCIGALPA');
  console.log('=' .repeat(60));
  
  // Encontrar todos los archivos a procesar
  let allFiles = [];
  for (const dir of TARGET_DIRECTORIES) {
    const fullDir = path.join(projectRoot, dir);
    if (fs.existsSync(fullDir)) {
      allFiles.push(...findFiles(fullDir));
    }
  }
  
  console.log(`📁 Encontrados ${allFiles.length} archivos para procesar`);
  console.log('');
  
  // Procesar cada archivo
  for (const file of allFiles) {
    processFile(file);
  }
  
  console.log('');
  console.log('=' .repeat(60));
  console.log(`🎯 RESUMEN:`);
  console.log(`   📄 Archivos procesados: ${totalFilesProcessed}`);
  console.log(`   🔧 Cambios realizados: ${totalChanges}`);
  
  if (totalChanges > 0) {
    console.log('');
    console.log('🚨 IMPORTANTE: Ejecuta los siguientes comandos:');
    console.log('   npm run build  # Para verificar que no hay errores');
    console.log('   git add .      # Para agregar los cambios');
    console.log('   git commit -m "🇭🇳 Fix timezone issues - use America/Tegucigalpa consistently"');
  } else {
    console.log('');
    console.log('✨ No se encontraron problemas de timezone para corregir.');
  }
}

main();
