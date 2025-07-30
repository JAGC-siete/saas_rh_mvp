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

async function checkUserPermissions() {
  console.log('🔍 Checking User Permissions for Payroll Access...\n');
  
  // Test 1: Check if we can access user profile endpoint
  console.log('1️⃣ Testing user profile access...');
  try {
    const profileResponse = await makeRequest(`${RAILWAY_URL}/api/auth/validate`);
    if (profileResponse.status === 200) {
      console.log('✅ User profile accessible');
      console.log(`   User data: ${JSON.stringify(profileResponse.data, null, 2)}`);
    } else {
      console.log(`❌ User profile error: ${profileResponse.status}`);
      console.log(`   Error: ${profileResponse.data.error || 'Unknown'}`);
    }
  } catch (error) {
    console.log(`❌ User profile error: ${error.message}`);
  }
  
  // Test 2: Check payroll calculation with detailed error
  console.log('\n2️⃣ Testing payroll calculation with detailed error...');
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
    
    console.log(`   Status: ${calculateResponse.status}`);
    console.log(`   Error: ${calculateResponse.data.error || 'None'}`);
    
    if (calculateResponse.status === 401) {
      console.log('❌ UNAUTHORIZED: User not authenticated');
    } else if (calculateResponse.status === 403) {
      console.log('❌ FORBIDDEN: User authenticated but insufficient permissions');
      console.log('   This means the user exists but lacks required role');
    } else if (calculateResponse.status === 200) {
      console.log('✅ SUCCESS: Payroll calculation works!');
    } else {
      console.log(`❌ UNEXPECTED: ${calculateResponse.status} - ${calculateResponse.data.error}`);
    }
  } catch (error) {
    console.log(`❌ Payroll calculation error: ${error.message}`);
  }
  
  console.log('\n📊 PERMISSION DIAGNOSIS');
  console.log('========================');
  console.log('');
  console.log('🎯 POSIBLES CAUSAS DEL ERROR:');
  console.log('');
  console.log('1️⃣ Usuario NO existe en user_profiles:');
  console.log('   - El usuario está autenticado en Supabase Auth');
  console.log('   - Pero NO tiene registro en la tabla user_profiles');
  console.log('   - SOLUCIÓN: Crear registro en user_profiles');
  console.log('');
  console.log('2️⃣ Usuario tiene rol incorrecto:');
  console.log('   - El usuario existe en user_profiles');
  console.log('   - Pero su rol NO es company_admin, hr_manager, o super_admin');
  console.log('   - SOLUCIÓN: Cambiar rol a company_admin');
  console.log('');
  console.log('3️⃣ Usuario NO tiene company_id:');
  console.log('   - El usuario existe pero company_id es NULL');
  console.log('   - SOLUCIÓN: Asignar company_id válido');
  console.log('');
  console.log('🔧 SOLUCIONES RÁPIDAS:');
  console.log('');
  console.log('SOLUCIÓN 1 - Crear usuario con permisos completos:');
  console.log('   INSERT INTO user_profiles (id, company_id, role) VALUES');
  console.log('   (\'TU_USER_ID\', \'00000000-0000-0000-0000-000000000001\', \'company_admin\');');
  console.log('');
  console.log('SOLUCIÓN 2 - Dar permisos a cualquier usuario autenticado:');
  console.log('   - Modificar el código para permitir acceso sin verificar rol');
  console.log('   - Temporalmente para desarrollo');
  console.log('');
  console.log('SOLUCIÓN 3 - Verificar usuario actual:');
  console.log('   SELECT * FROM user_profiles WHERE id = \'TU_USER_ID\';');
  console.log('');
  console.log('📋 PASOS PARA ARREGLAR:');
  console.log('   1. Ir a Supabase Studio > SQL Editor');
  console.log('   2. Ejecutar: SELECT * FROM user_profiles;');
  console.log('   3. Si tu usuario no existe, crear registro');
  console.log('   4. Si existe, verificar que role = \'company_admin\'');
  console.log('   5. Probar generar nómina nuevamente');
}

checkUserPermissions().catch(console.error); 