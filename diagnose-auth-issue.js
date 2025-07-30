#!/usr/bin/env node

const https = require('https');

const RAILWAY_URL = 'https://zesty-abundance-production.up.railway.app';

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function diagnoseAuthIssue() {
  console.log('🔍 Diagnosing Authentication Issue for Payroll Generation...\n');
  
  // Test 1: Check if login page is accessible
  console.log('1️⃣ Testing login page accessibility...');
  try {
    const loginPage = await makeRequest(`${RAILWAY_URL}/login`);
    if (loginPage.status === 200) {
      console.log('✅ Login page accessible');
      console.log(`   Content-Type: ${loginPage.headers['content-type']}`);
      
      // Check if it contains login form
      if (loginPage.data.includes('login') || loginPage.data.includes('email') || loginPage.data.includes('password')) {
        console.log('✅ Login form detected');
      } else {
        console.log('⚠️ Login form not found');
      }
    } else {
      console.log(`❌ Login page error: ${loginPage.status}`);
    }
  } catch (error) {
    console.log(`❌ Login page error: ${error.message}`);
  }
  
  // Test 2: Check if payroll page requires authentication
  console.log('\n2️⃣ Testing payroll page authentication requirement...');
  try {
    const payrollPage = await makeRequest(`${RAILWAY_URL}/payroll`);
    if (payrollPage.status === 200) {
      console.log('⚠️ Payroll page accessible without authentication (PROBLEM!)');
      console.log(`   Status: ${payrollPage.status}`);
      console.log(`   Content-Type: ${payrollPage.headers['content-type']}`);
    } else if (payrollPage.status === 401 || payrollPage.status === 403) {
      console.log('✅ Payroll page correctly requires authentication');
      console.log(`   Status: ${payrollPage.status} ${payrollPage.status === 401 ? 'Unauthorized' : 'Forbidden'}`);
    } else {
      console.log(`❌ Payroll page unexpected response: ${payrollPage.status}`);
    }
  } catch (error) {
    console.log(`❌ Payroll page error: ${error.message}`);
  }
  
  // Test 3: Check payroll calculation endpoint
  console.log('\n3️⃣ Testing payroll calculation endpoint...');
  try {
    const calculateResponse = await makeRequest(`${RAILWAY_URL}/api/payroll/calculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        periodo: '2025-01',
        quincena: 1,
        incluirDeducciones: false
      })
    });
    
    if (calculateResponse.status === 401) {
      console.log('✅ Payroll calculation correctly requires authentication');
      console.log(`   Status: ${calculateResponse.status} Unauthorized`);
      console.log(`   Error: ${calculateResponse.data.error}`);
    } else if (calculateResponse.status === 200) {
      console.log('⚠️ Payroll calculation accessible without authentication (PROBLEM!)');
      console.log(`   Status: ${calculateResponse.status}`);
    } else {
      console.log(`❌ Payroll calculation unexpected response: ${calculateResponse.status}`);
      console.log(`   Error: ${calculateResponse.data.error || 'Unknown'}`);
    }
  } catch (error) {
    console.log(`❌ Payroll calculation error: ${error.message}`);
  }
  
  // Test 4: Check if there are any public endpoints that should be protected
  console.log('\n4️⃣ Testing other protected endpoints...');
  
  const protectedEndpoints = [
    '/api/payroll/export?periodo=2025-01&quincena=1',
    '/api/employees',
    '/api/attendance/register'
  ];
  
  for (const endpoint of protectedEndpoints) {
    try {
      const response = await makeRequest(`${RAILWAY_URL}${endpoint}`);
      console.log(`   ${endpoint}: ${response.status} ${response.status === 401 ? '✅ Protected' : '⚠️ Not Protected'}`);
    } catch (error) {
      console.log(`   ${endpoint}: ❌ Error - ${error.message}`);
    }
  }
  
  console.log('\n📊 AUTHENTICATION DIAGNOSIS SUMMARY');
  console.log('====================================');
  console.log('🎯 ROOT CAUSE ANALYSIS:');
  console.log('');
  console.log('❌ CAUSA MÁS PROBABLE: Usuario NO está autenticado');
  console.log('   - El usuario está en /payroll pero no ha hecho login');
  console.log('   - El endpoint requiere autenticación de Supabase');
  console.log('   - Necesita crear una cuenta o hacer login primero');
  console.log('');
  console.log('🔧 SOLUCIONES:');
  console.log('   1. Crear usuario de prueba en Supabase Auth');
  console.log('   2. Hacer login con credenciales válidas');
  console.log('   3. Verificar que el usuario tenga rol company_admin o hr_manager');
  console.log('');
  console.log('📋 PASOS PARA ARREGLAR:');
  console.log('   1. Ir a Supabase Studio');
  console.log('   2. Crear usuario en Authentication > Users');
  console.log('   3. Asignar rol company_admin en user_profiles');
  console.log('   4. Hacer login en la aplicación');
  console.log('   5. Probar generar nómina');
}

diagnoseAuthIssue().catch(console.error); 