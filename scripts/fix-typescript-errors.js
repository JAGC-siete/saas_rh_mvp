#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Script de corrección automática de errores TypeScript');
console.log('==================================================');

// Patrones de corrección comunes
const fixes = [
  {
    name: 'Parámetros implícitos any',
    pattern: /\.filter\(([^)]+)\)/g,
    replacement: (match, param) => {
      if (!param.includes(': any')) {
        return match.replace(param, `(${param.trim()}: any)`);
      }
      return match;
    }
  },
  {
    name: 'Parámetros reduce implícitos',
    pattern: /\.reduce\(\(([^,]+),\s*([^)]+)\)/g,
    replacement: (match, total, record) => {
      if (!total.includes(': number') && !record.includes(': any')) {
        return match.replace(total, `${total.trim()}: number`).replace(record, `${record.trim()}: any`);
      }
      return match;
    }
  },
  {
    name: 'Parámetros forEach implícitos',
    pattern: /\.forEach\(([^)]+)\)/g,
    replacement: (match, param) => {
      if (!param.includes(': any')) {
        return match.replace(param, `(${param.trim()}: any)`);
      }
      return match;
    }
  },
  {
    name: 'Parámetros map implícitos',
    pattern: /\.map\(([^)]+)\)/g,
    replacement: (match, param) => {
      if (!param.includes(': any')) {
        return match.replace(param, `(${param.trim()}: any)`);
      }
      return match;
    }
  },
  {
    name: 'Error handling unknown type',
    pattern: /error\.message/g,
    replacement: 'error instanceof Error ? error.message : \'Error desconocido\''
  },
  {
    name: 'Propiedades posiblemente undefined',
    pattern: /(\w+)\.(\w+)/g,
    replacement: (match, obj, prop) => {
      // Solo aplicar a patrones específicos que sabemos que pueden ser undefined
      const riskyProps = ['role', 'company_id', 'name', 'email'];
      if (riskyProps.includes(prop)) {
        return `${obj}?.${prop}`;
      }
      return match;
    }
  },
  {
    name: 'Catch en RPC calls',
    pattern: /\.catch\(\(\) => \(\{ data: null, error: \{ message: 'Función RPC no disponible' \} \}\)\)/g,
    replacement: `\n    let rlsPolicies = null\n    let rlsError = null\n    try {\n      const result = await supabase.rpc('get_rls_policies', { table_name: 'user_profiles' })\n      rlsPolicies = result.data\n      rlsError = result.error\n    } catch (error) {\n      rlsError = { message: 'Función RPC no disponible' }\n    }`
  }
];

// Archivos TypeScript a procesar
const tsFiles = [
  'pages/api/attendance/dashboard-stats.ts',
  'pages/api/attendance/export-report.ts',
  'pages/api/payroll/calculate.ts',
  'pages/api/payroll/export.ts',
  'pages/api/debug-complete.ts',
  'pages/api/debug-user.ts',
  'middleware.ts',
  'lib/logger.ts'
];

let totalFixes = 0;

tsFiles.forEach(filePath => {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Archivo no encontrado: ${filePath}`);
    return;
  }

  console.log(`\n📁 Procesando: ${filePath}`);
  let content = fs.readFileSync(filePath, 'utf8');
  let fileFixes = 0;

  fixes.forEach(fix => {
    const beforeLength = content.length;
    content = content.replace(fix.pattern, fix.replacement);
    const afterLength = content.length;
    
    if (beforeLength !== afterLength) {
      console.log(`  ✅ ${fix.name}`);
      fileFixes++;
    }
  });

  if (fileFixes > 0) {
    fs.writeFileSync(filePath, content);
    console.log(`  🎯 ${fileFixes} correcciones aplicadas`);
    totalFixes += fileFixes;
  } else {
    console.log(`  ✅ Sin errores detectados`);
  }
});

console.log(`\n🎉 Proceso completado!`);
console.log(`📊 Total de correcciones: ${totalFixes}`);

// Verificar si hay errores restantes
console.log('\n🔍 Verificando errores restantes...');
try {
  execSync('npm run build', { stdio: 'pipe' });
  console.log('✅ ¡Build exitoso! Todos los errores TypeScript han sido corregidos.');
} catch (error) {
  console.log('⚠️  Aún hay errores TypeScript. Revisando...');
  
  // Mostrar errores específicos
  try {
    const buildOutput = execSync('npm run build 2>&1', { encoding: 'utf8' });
    const errorLines = buildOutput.split('\n').filter(line => 
      line.includes('Type error:') || line.includes('Failed to compile')
    );
    
    if (errorLines.length > 0) {
      console.log('\n🚨 Errores restantes:');
      errorLines.forEach(line => console.log(`  ${line}`));
      console.log('\n💡 Sugerencia: Algunos errores pueden requerir corrección manual.');
    }
  } catch (e) {
    console.log('❌ No se pudo obtener información detallada de errores.');
  }
}

console.log('\n✨ Script completado. ¡Gracias por usar la corrección automática!'); 