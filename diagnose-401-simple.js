#!/usr/bin/env node

const https = require('https');
const http = require('http');

console.log('🔍 DIAGNÓSTICO SIMPLE - Error 401\n');

// Configuración - Usar Railway URL directamente
const BASE_URL = 'https://zesty-abundance-production.up.railway.app';
const ENDPOINTS = [
  { path: '/', method: 'GET' },
  { path: '/auth', method: 'GET' },
  { path: '/api/payroll/calculate', method: 'POST', data: JSON.stringify({ periodo: '2025-07', quincena: 1 }) },
  { path: '/api/health', method: 'GET' }
];

// Función simple para hacer requests
function makeRequest(url, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'User-Agent': 'Diagnostic-Script/1.0',
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      options.headers['Content-Length'] = Buffer.byteLength(data);
    }

    const client = urlObj.protocol === 'https:' ? https : http;
    const req = client.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: body,
          url: url
        });
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(data);
    }
    
    req.end();
  });
}

async function runDiagnostic() {
  console.log('📡 Probando conectividad básica...\n');

  for (const endpoint of ENDPOINTS) {
    try {
      const url = BASE_URL + endpoint.path;
      console.log(`🔗 Probando: ${endpoint.method} ${endpoint.path}`);
      
      const response = await makeRequest(url, endpoint.method, endpoint.data);
      
      // Color coding para status codes
      let statusColor = '🟢'; // Verde para 200
      if (response.status >= 400 && response.status < 500) statusColor = '🟡'; // Amarillo para 4xx
      if (response.status >= 500) statusColor = '🔴'; // Rojo para 5xx
      
      console.log(`   ${statusColor} Status: ${response.status}`);
      
      // Análisis específico para cada endpoint
      if (endpoint.path === '/') {
        if (response.status === 200) {
          console.log('   ✅ Página principal funciona');
        } else {
          console.log('   ❌ Página principal no responde');
        }
      }
      
      if (endpoint.path === '/auth') {
        if (response.status === 200) {
          console.log('   ✅ Endpoint de auth responde');
        } else if (response.status === 401) {
          console.log('   ⚠️  Auth requiere login (normal)');
        } else {
          console.log('   ❌ Auth no funciona correctamente');
        }
      }
      
      if (endpoint.path === '/api/payroll/calculate') {
        if (response.status === 401) {
          console.log('   ❌ PAYROLL: Usuario NO autenticado');
          console.log('   💡 SOLUCIÓN: Necesitas hacer login en el navegador');
        } else if (response.status === 200) {
          console.log('   ✅ PAYROLL: Funciona correctamente');
        } else if (response.status === 405) {
          console.log('   ❌ PAYROLL: Método no permitido (debería ser POST)');
        } else {
          console.log(`   ❌ PAYROLL: Error ${response.status}`);
        }
        
        // Mostrar respuesta si hay error
        if (response.status !== 200) {
          console.log(`   📄 Respuesta: ${response.body.substring(0, 200)}...`);
        }
      }
      
      if (endpoint.path === '/api/health') {
        if (response.status === 200) {
          console.log('   ✅ Health check funciona');
        } else {
          console.log('   ❌ Health check falló');
        }
      }
      
      console.log('');
      
    } catch (error) {
      console.log(`   🔴 ERROR: ${error.message}`);
      console.log('');
    }
  }

  console.log('🎯 RESUMEN:');
  console.log('Si ves ❌ en PAYROLL, necesitas:');
  console.log('1. Ir a https://zesty-abundance-production.up.railway.app');
  console.log('2. Hacer click en "Sign In"');
  console.log('3. Loguearte con tus credenciales');
  console.log('4. Probar generar nómina nuevamente');
  console.log('');
  console.log('Si sigue fallando, el problema es de permisos en Supabase.');
}

// Ejecutar diagnóstico
runDiagnostic().catch(console.error); 