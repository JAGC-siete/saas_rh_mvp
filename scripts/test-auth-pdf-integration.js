#!/usr/bin/env node

/**
 * 🧪 SCRIPT DE PRUEBA DE INTEGRACIÓN AUTH + PDF
 * Prueba la autenticación y la generación de PDFs
 * 
 * Uso: node scripts/test-auth-pdf-integration.js
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

// 1. VERIFICAR ESTRUCTURA DE ARCHIVOS
function verifyFileStructure() {
  log('\n🔍 VERIFICANDO ESTRUCTURA DE ARCHIVOS', 'bold');
  log('=' .repeat(50), 'blue');
  
  const requiredFiles = [
    'middleware.ts',
    'lib/auth.tsx',
    'lib/supabase/client.ts',
    'pages/login.tsx',
    'components/PayrollManager.tsx',
    'pages/api/payroll/calculate.ts',
    'pages/api/auth/debug.ts'
  ];
  
  let allPresent = true;
  
  for (const file of requiredFiles) {
    if (fs.existsSync(file)) {
      log(`✅ ${file}`, 'green');
    } else {
      log(`❌ ${file} (faltante)`, 'red');
      allPresent = false;
    }
  }
  
  return allPresent;
}

// 2. VERIFICAR CONFIGURACIÓN DE MIDDLEWARE
function verifyMiddlewareConfig() {
  log('\n🔍 VERIFICANDO CONFIGURACIÓN DE MIDDLEWARE', 'bold');
  log('=' .repeat(50), 'blue');
  
  const middlewareContent = fs.readFileSync('middleware.ts', 'utf8');
  
  const checks = [
    {
      name: 'Import createServerClient',
      check: middlewareContent.includes('createServerClient'),
      description: 'Middleware debe usar createServerClient de Supabase SSR'
    },
    {
      name: 'Validación de cookies',
      check: middlewareContent.includes('request.cookies.get'),
      description: 'Middleware debe validar cookies de Supabase'
    },
    {
      name: 'Validación de sesión',
      check: middlewareContent.includes('supabase.auth.getSession'),
      description: 'Middleware debe validar sesiones de Supabase'
    },
    {
      name: 'Rutas públicas',
      check: middlewareContent.includes('/login') && middlewareContent.includes('/api/'),
      description: 'Middleware debe permitir rutas públicas'
    }
  ];
  
  let allPassed = true;
  
  for (const check of checks) {
    if (check.check) {
      log(`✅ ${check.name}`, 'green');
    } else {
      log(`❌ ${check.name}`, 'red');
      log(`   ${check.description}`, 'yellow');
      allPassed = false;
    }
  }
  
  return allPassed;
}

// 3. VERIFICAR CONFIGURACIÓN DE PAYROLL MANAGER
function verifyPayrollManagerConfig() {
  log('\n🔍 VERIFICANDO CONFIGURACIÓN DE PAYROLL MANAGER', 'bold');
  log('=' .repeat(50), 'blue');
  
  const payrollContent = fs.readFileSync('components/PayrollManager.tsx', 'utf8');
  
  const checks = [
    {
      name: 'Verificación de autenticación',
      check: payrollContent.includes('supabase.auth.getUser'),
      description: 'Debe verificar autenticación antes de descargar PDF'
    },
    {
      name: 'Credentials include',
      check: payrollContent.includes('credentials: \'include\''),
      description: 'Debe incluir credenciales en la petición fetch'
    },
    {
      name: 'Manejo de errores',
      check: payrollContent.includes('catch (error') && payrollContent.includes('alert('),
      description: 'Debe manejar errores de autenticación'
    },
    {
      name: 'Headers de autenticación',
      check: payrollContent.includes('Content-Type') && payrollContent.includes('Accept'),
      description: 'Debe incluir headers apropiados'
    }
  ];
  
  let allPassed = true;
  
  for (const check of checks) {
    if (check.check) {
      log(`✅ ${check.name}`, 'green');
    } else {
      log(`❌ ${check.name}`, 'red');
      log(`   ${check.description}`, 'yellow');
      allPassed = false;
    }
  }
  
  return allPassed;
}

// 4. VERIFICAR ENDPOINTS DE API
function verifyAPIEndpoints() {
  log('\n🔍 VERIFICANDO ENDPOINTS DE API', 'bold');
  log('=' .repeat(50), 'blue');
  
  const apiFiles = [
    'pages/api/payroll/calculate.ts',
    'pages/api/auth/debug.ts'
  ];
  
  let allPresent = true;
  
  for (const file of apiFiles) {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      
      if (file.includes('calculate.ts')) {
        // Verificar configuración de PDF
        if (content.includes('pdfkit') || content.includes('PDFDocument')) {
          log(`✅ ${file} (con generación PDF)`, 'green');
        } else {
          log(`⚠️  ${file} (sin generación PDF detectada)`, 'yellow');
        }
      } else if (file.includes('debug.ts')) {
        // Verificar endpoint de debug
        if (content.includes('supabase.auth.getUser')) {
          log(`✅ ${file} (endpoint de debug)`, 'green');
        } else {
          log(`⚠️  ${file} (configuración básica)`, 'yellow');
        }
      }
    } else {
      log(`❌ ${file} (faltante)`, 'red');
      allPresent = false;
    }
  }
  
  return allPresent;
}

// 5. CREAR SCRIPT DE PRUEBA MANUAL
function createManualTestScript() {
  log('\n🔧 CREANDO SCRIPT DE PRUEBA MANUAL', 'bold');
  log('=' .repeat(50), 'blue');
  
  const testScript = `#!/usr/bin/env node

/**
 * 🧪 SCRIPT DE PRUEBA MANUAL DE AUTH + PDF
 * Ejecutar después de iniciar el servidor: npm run dev
 */

const https = require('https');
const http = require('http');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

async function testEndpoint(endpoint, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, BASE_URL);
    const client = url.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };
    
    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', reject);
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

async function runTests() {
  console.log('🧪 INICIANDO PRUEBAS DE INTEGRACIÓN AUTH + PDF\\n');
  
  // 1. Probar endpoint de debug
  console.log('1️⃣ Probando endpoint de debug...');
  try {
    const debugResult = await testEndpoint('/api/auth/debug');
    console.log('   Status:', debugResult.status);
    console.log('   Data:', JSON.stringify(debugResult.data, null, 2));
  } catch (error) {
    console.error('   ❌ Error:', error.message);
  }
  
  // 2. Probar endpoint de health
  console.log('\\n2️⃣ Probando endpoint de health...');
  try {
    const healthResult = await testEndpoint('/api/health');
    console.log('   Status:', healthResult.status);
    console.log('   Data:', healthResult.data);
  } catch (error) {
    console.error('   ❌ Error:', error.message);
  }
  
  // 3. Probar endpoint de payroll (sin auth)
  console.log('\\n3️⃣ Probando endpoint de payroll (sin auth)...');
  try {
    const payrollResult = await testEndpoint('/api/payroll/calculate', 'POST', {
      periodo: '2025-01',
      quincena: 1,
      incluirDeducciones: true
    });
    console.log('   Status:', payrollResult.status);
    console.log('   Expected: 401 (Unauthorized)');
  } catch (error) {
    console.error('   ❌ Error:', error.message);
  }
  
  console.log('\\n✅ Pruebas completadas');
  console.log('\\n📝 PRÓXIMOS PASOS:');
  console.log('1. Iniciar sesión en http://localhost:3000/login');
  console.log('2. Ir a la sección de nómina');
  console.log('3. Intentar generar/descargar un PDF');
  console.log('4. Verificar que funciona sin errores de autenticación');
}

runTests().catch(console.error);
`;
  
  try {
    fs.writeFileSync('test-auth-pdf-manual.js', testScript, 'utf8');
    log('✅ Script de prueba manual creado: test-auth-pdf-manual.js', 'green');
    return true;
  } catch (error) {
    log(`❌ Error creando script: ${error.message}`, 'red');
    return false;
  }
}

// 6. MOSTRAR RESUMEN Y PRÓXIMOS PASOS
function showSummary(structureGood, middlewareGood, payrollGood, apiGood, scriptCreated) {
  log('\n📊 RESUMEN DE VERIFICACIÓN', 'bold');
  log('=' .repeat(40), 'blue');
  
  const results = [
    { name: 'Estructura de archivos', good: structureGood },
    { name: 'Configuración de middleware', good: middlewareGood },
    { name: 'Configuración de PayrollManager', good: payrollGood },
    { name: 'Endpoints de API', good: apiGood },
    { name: 'Script de prueba manual', good: scriptCreated }
  ];
  
  let allGood = true;
  
  for (const result of results) {
    if (result.good) {
      log(`✅ ${result.name}`, 'green');
    } else {
      log(`❌ ${result.name}`, 'red');
      allGood = false;
    }
  }
  
  log('\n🚀 PRÓXIMOS PASOS:', 'bold');
  log('1. Reiniciar el servidor de desarrollo', 'blue');
  log('   npm run dev', 'yellow');
  log('', 'reset');
  log('2. Ejecutar pruebas manuales', 'blue');
  log('   node test-auth-pdf-manual.js', 'yellow');
  log('', 'reset');
  log('3. Probar login y generación de PDF', 'blue');
  log('   - Ir a http://localhost:3000/login', 'yellow');
  log('   - Iniciar sesión', 'yellow');
  log('   - Ir a nómina y generar PDF', 'yellow');
  log('', 'reset');
  
  log('\n🔍 PARA DEBUGGING:', 'bold');
  log('1. Verificar logs del servidor', 'blue');
  log('2. Revisar consola del navegador', 'blue');
  log('3. Usar endpoint de debug: /api/auth/debug', 'blue');
  log('4. Verificar cookies de Supabase', 'blue');
  
  return allGood;
}

// FUNCIÓN PRINCIPAL
async function main() {
  log('🧪 VERIFICACIÓN DE INTEGRACIÓN AUTH + PDF', 'bold');
  log('=' .repeat(60), 'blue');
  
  try {
    // Ejecutar verificaciones
    const structureGood = verifyFileStructure();
    const middlewareGood = verifyMiddlewareConfig();
    const payrollGood = verifyPayrollManagerConfig();
    const apiGood = verifyAPIEndpoints();
    const scriptCreated = createManualTestScript();
    
    // Mostrar resumen
    const allGood = showSummary(structureGood, middlewareGood, payrollGood, apiGood, scriptCreated);
    
    if (allGood) {
      log('\n🎉 ¡Sistema listo para pruebas!', 'bold');
    } else {
      log('\n⚠️  Se encontraron problemas que necesitan atención', 'yellow');
    }
    
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
  verifyFileStructure,
  verifyMiddlewareConfig,
  verifyPayrollManagerConfig,
  verifyAPIEndpoints,
  createManualTestScript
}; 