#!/usr/bin/env node

/**
 * 🧹 SCRIPT PARA LIMPIAR IMPORTS DUPLICADOS DE TIMEZONE
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

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

function cleanupDuplicates(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let newContent = content;
    let changed = false;
    
    // Encontrar todos los imports de timezone
    const timezoneImportRegex = /import\s*\{\s*([^}]+)\s*\}\s*from\s*['"][^'"]*timezone['"]/g;
    const matches = [...content.matchAll(timezoneImportRegex)];
    
    if (matches.length > 1) {
      // Combinar todos los imports
      const allFunctions = new Set();
      
      matches.forEach(match => {
        const functions = match[1].split(',').map(f => f.trim()).filter(f => f);
        functions.forEach(func => allFunctions.add(func));
      });
      
      // Crear un solo import
      const importPath = matches[0][0].match(/from\s*['"]([^'"]+)['"]/)[1];
      const newImport = `import { ${[...allFunctions].join(', ')} } from '${importPath}'`;
      
      // Remover todos los imports existentes
      let cleanContent = content;
      matches.forEach(match => {
        cleanContent = cleanContent.replace(match[0], '');
      });
      
      // Agregar el nuevo import en la posición correcta
      const lines = cleanContent.split('\n');
      let insertIndex = 0;
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('import ')) {
          insertIndex = i + 1;
        } else if (lines[i].trim() === '' && insertIndex > 0) {
          break;
        }
      }
      
      lines.splice(insertIndex, 0, newImport);
      newContent = lines.join('\n');
      changed = true;
      
      console.log(`✅ Fixed duplicate imports in ${path.relative(projectRoot, filePath)}`);
    }
    
    if (changed) {
      fs.writeFileSync(filePath, newContent);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  console.log('🧹 LIMPIANDO IMPORTS DUPLICADOS DE TIMEZONE...');
  console.log('=' .repeat(50));
  
  const targetDirs = ['pages', 'components', 'lib'];
  let totalFixed = 0;
  
  for (const dir of targetDirs) {
    const fullDir = path.join(projectRoot, dir);
    if (!fs.existsSync(fullDir)) continue;
    
    const files = findFiles(fullDir);
    
    for (const file of files) {
      if (cleanupDuplicates(file)) {
        totalFixed++;
      }
    }
  }
  
  console.log('=' .repeat(50));
  console.log(`🎯 Archivos corregidos: ${totalFixed}`);
}

main();
