#!/usr/bin/env node

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
  console.log('🧪 INICIANDO PRUEBAS DE INTEGRACIÓN AUTH + PDF\n');
  
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
  console.log('\n2️⃣ Probando endpoint de health...');
  try {
    const healthResult = await testEndpoint('/api/health');
    console.log('   Status:', healthResult.status);
    console.log('   Data:', healthResult.data);
  } catch (error) {
    console.error('   ❌ Error:', error.message);
  }
  
  // 3. Probar endpoint de payroll (sin auth)
  console.log('\n3️⃣ Probando endpoint de payroll (sin auth)...');
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
  
  console.log('\n✅ Pruebas completadas');
  console.log('\n📝 PRÓXIMOS PASOS:');
  console.log('1. Iniciar sesión en http://localhost:3000/login');
  console.log('2. Ir a la sección de nómina');
  console.log('3. Intentar generar/descargar un PDF');
  console.log('4. Verificar que funciona sin errores de autenticación');
}

runTests().catch(console.error);
