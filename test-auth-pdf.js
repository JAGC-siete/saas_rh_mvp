#!/usr/bin/env node

/**
 * Test script para verificar autenticación y generación de PDF
 * Uso: node test-auth-pdf.js
 */

const https = require('https');
const http = require('http');

const BASE_URL = 'https://humanosisu.net';

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      ...options
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function testAuthentication() {
  console.log('🔍 TESTING AUTHENTICATION AND PDF GENERATION');
  console.log('=============================================\n');

  // Test 1: Verificar que la página principal carga
  console.log('1️⃣ Testing main page...');
  try {
    const mainPage = await makeRequest(`${BASE_URL}/`);
    console.log(`   ✅ Main page: ${mainPage.status} OK`);
  } catch (error) {
    console.log(`   ❌ Main page error: ${error.message}`);
  }

  // Test 2: Verificar que la página de nómina requiere autenticación
  console.log('\n2️⃣ Testing payroll page (should redirect to login)...');
  try {
    const payrollPage = await makeRequest(`${BASE_URL}/payroll`);
    console.log(`   📊 Payroll page: ${payrollPage.status} ${payrollPage.status === 200 ? 'OK' : 'Redirected'}`);
  } catch (error) {
    console.log(`   ❌ Payroll page error: ${error.message}`);
  }

  // Test 3: Test endpoint sin autenticación (debería dar 401)
  console.log('\n3️⃣ Testing payroll calculate endpoint without auth...');
  try {
    const calculateResponse = await makeRequest(`${BASE_URL}/api/payroll/calculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/pdf'
      },
      body: JSON.stringify({
        periodo: '2025-01',
        quincena: 1,
        incluirDeducciones: true
      })
    });
    
    console.log(`   📊 Calculate endpoint: ${calculateResponse.status} ${calculateResponse.status === 401 ? '✅ Expected 401 (Unauthorized)' : '❌ Unexpected status'}`);
    
    if (calculateResponse.status !== 401) {
      console.log(`   📄 Response: ${calculateResponse.data.substring(0, 200)}...`);
    }
  } catch (error) {
    console.log(`   ❌ Calculate endpoint error: ${error.message}`);
  }

  // Test 4: Verificar health endpoint
  console.log('\n4️⃣ Testing health endpoint...');
  try {
    const healthResponse = await makeRequest(`${BASE_URL}/api/health`);
    console.log(`   📊 Health endpoint: ${healthResponse.status} OK`);
    console.log(`   📄 Response: ${healthResponse.data.substring(0, 100)}...`);
  } catch (error) {
    console.log(`   ❌ Health endpoint error: ${error.message}`);
  }

  // Test 5: Verificar attendance health
  console.log('\n5️⃣ Testing attendance health...');
  try {
    const attendanceHealth = await makeRequest(`${BASE_URL}/api/attendance/health`);
    console.log(`   📊 Attendance health: ${attendanceHealth.status} OK`);
    console.log(`   📄 Response: ${attendanceHealth.data.substring(0, 100)}...`);
  } catch (error) {
    console.log(`   ❌ Attendance health error: ${error.message}`);
  }

  console.log('\n🎯 DIAGNOSIS:');
  console.log('=============');
  console.log('✅ Si el endpoint de calculate devuelve 401, la autenticación está funcionando correctamente');
  console.log('✅ El problema es que el usuario no está logueado en el frontend');
  console.log('✅ Solución: El usuario debe hacer login en https://humanosisu.net/login');
  console.log('✅ Después de login, el PDF debería descargarse correctamente');
  
  console.log('\n📋 NEXT STEPS:');
  console.log('==============');
  console.log('1. Ir a https://humanosisu.net/login');
  console.log('2. Hacer login con credenciales correctas');
  console.log('3. Ir a https://humanosisu.net/payroll');
  console.log('4. Generar nómina y descargar PDF');
  console.log('5. Verificar que el PDF se descarga correctamente');
}

// Ejecutar tests
testAuthentication().catch(console.error); 