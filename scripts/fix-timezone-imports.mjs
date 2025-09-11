#!/usr/bin/env node

/**
 * 🇭🇳 SCRIPT PARA CORREGIR IMPORTS DE TIMEZONE
 * 
 * Encuentra archivos que usan funciones de timezone pero no tienen los imports necesarios
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

const TIMEZONE_FUNCTIONS = [
  'nowInHonduras',
  'getHondurasTimestamp',
  'formatDateForHonduras',
  'formatDateTimeForHonduras',
  'todayInHonduras',
  'getHondurasTime',
  'convertToHondurasTime',
  'getTodayInHonduras'
];

function findFiles(dir, extensions = ['.ts', '.tsx', '.js', '.jsx']) {
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

function getImportPath(filePath) {
  const relativePath = path.relative(path.dirname(filePath), path.join(projectRoot, 'lib/timezone'));
  return relativePath.startsWith('.') ? relativePath.replace(/\\/g, '/') : `./${relativePath.replace(/\\/g, '/')}`;
}

function fixImports(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Encontrar funciones de timezone usadas
    const usedFunctions = TIMEZONE_FUNCTIONS.filter(func => 
      content.includes(`${func}(`) && !content.includes(`function ${func}`) && !content.includes(`export function ${func}`)
    );
    
    if (usedFunctions.length === 0) return false;
    
    // Verificar si ya tiene import de timezone
    const hasTimezoneImport = content.includes("from '../../../lib/timezone'") || 
                             content.includes("from '../../lib/timezone'") || 
                             content.includes("from '../lib/timezone'") ||
                             content.includes("from './lib/timezone'");
    
    if (hasTimezoneImport) {
      // Verificar si el import existente incluye todas las funciones necesarias
      const importMatch = content.match(/import\s*\{\s*([^}]+)\s*\}\s*from\s*['"][^'"]*timezone['"]/);
      if (importMatch) {
        const existingImports = importMatch[1].split(',').map(i => i.trim());
        const missingFunctions = usedFunctions.filter(func => !existingImports.includes(func));
        
        if (missingFunctions.length > 0) {
          // Actualizar import existente
          const newImports = [...existingImports, ...missingFunctions].join(', ');
          const newContent = content.replace(importMatch[0], importMatch[0].replace(importMatch[1], ` ${newImports} `));
          fs.writeFileSync(filePath, newContent);
          console.log(`✅ Updated timezone import in ${path.relative(projectRoot, filePath)} - added: ${missingFunctions.join(', ')}`);
          return true;
        }
      }
      return false;
    }
    
    // Agregar nuevo import
    const importStatement = `import { ${usedFunctions.join(', ')} } from '${getImportPath(filePath)}'`;
    
    const lines = content.split('\n');
    let insertIndex = 0;
    
    // Buscar después de otros imports
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('import ')) {
        insertIndex = i + 1;
      } else if (lines[i].trim() === '' && insertIndex > 0) {
        break;
      }
    }
    
    lines.splice(insertIndex, 0, importStatement);
    fs.writeFileSync(filePath, lines.join('\n'));
    
    console.log(`✅ Added timezone import to ${path.relative(projectRoot, filePath)} - functions: ${usedFunctions.join(', ')}`);
    return true;
    
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  console.log('🔧 CORRIGIENDO IMPORTS DE TIMEZONE...');
  console.log('=' .repeat(50));
  
  const targetDirs = ['pages', 'components', 'lib'];
  let totalFixed = 0;
  
  for (const dir of targetDirs) {
    const fullDir = path.join(projectRoot, dir);
    if (!fs.existsSync(fullDir)) continue;
    
    const files = findFiles(fullDir);
    
    for (const file of files) {
      if (fixImports(file)) {
        totalFixed++;
      }
    }
  }
  
  console.log('=' .repeat(50));
  console.log(`🎯 Archivos corregidos: ${totalFixed}`);
  
  if (totalFixed > 0) {
    console.log('\n🚀 Ejecutando npm run build para verificar...');
  }
}

main();
