#!/usr/bin/env node

const https = require('https');
const fs = require('fs');

const RAILWAY_URL = 'https://zesty-abundance-production.up.railway.app';

// Helper function to make HTTPS requests
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

async function testRailwaySystem() {
  console.log('🚀 Testing Railway System...\n');
  
  const results = [];
  
  // 1. Test Health Endpoint
  console.log('1️⃣ Testing Health Endpoint...');
  try {
    const health = await makeRequest(`${RAILWAY_URL}/api/health`);
    if (health.status === 200) {
      console.log('✅ Health endpoint working');
      console.log(`   Status: ${health.data.status}`);
      console.log(`   Database: ${health.data.checks?.database?.status || 'N/A'}`);
      results.push({ test: 'Health', status: 'PASS' });
    } else {
      console.log('❌ Health endpoint failed');
      results.push({ test: 'Health', status: 'FAIL' });
    }
  } catch (error) {
    console.log('❌ Health endpoint error:', error.message);
    results.push({ test: 'Health', status: 'FAIL' });
  }
  
  // 2. Test Supabase Connection
  console.log('\n2️⃣ Testing Supabase Connection...');
  try {
    const supabase = await makeRequest(`${RAILWAY_URL}/api/test-supabase`);
    if (supabase.status === 200) {
      console.log('✅ Supabase connection working');
      console.log(`   Employees: ${supabase.data.employees?.length || 0}`);
      console.log(`   Schedules: ${supabase.data.schedules?.length || 0}`);
      results.push({ test: 'Supabase', status: 'PASS' });
    } else {
      console.log('❌ Supabase connection failed');
      results.push({ test: 'Supabase', status: 'FAIL' });
    }
  } catch (error) {
    console.log('❌ Supabase connection error:', error.message);
    results.push({ test: 'Supabase', status: 'FAIL' });
  }
  
  // 3. Test Attendance Registration
  console.log('\n3️⃣ Testing Attendance Registration...');
  try {
    const attendance = await makeRequest(`${RAILWAY_URL}/api/attendance/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        last5: '11111',
        justification: 'Test from Railway'
      })
    });
    
    if (attendance.status === 200) {
      console.log('✅ Attendance registration working');
      console.log(`   Message: ${attendance.data.message}`);
      console.log(`   Employee: ${attendance.data.employee?.name}`);
      results.push({ test: 'Attendance', status: 'PASS' });
    } else {
      console.log('❌ Attendance registration failed');
      console.log(`   Status: ${attendance.status}`);
      results.push({ test: 'Attendance', status: 'FAIL' });
    }
  } catch (error) {
    console.log('❌ Attendance registration error:', error.message);
    results.push({ test: 'Attendance', status: 'FAIL' });
  }
  
  // 4. Test Employee Lookup
  console.log('\n4️⃣ Testing Employee Lookup...');
  try {
    const lookup = await makeRequest(`${RAILWAY_URL}/api/attendance/lookup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        last5: '11111'
      })
    });
    
    if (lookup.status === 200) {
      console.log('✅ Employee lookup working');
      console.log(`   Employee: ${lookup.data.employee?.name}`);
      console.log(`   Status: ${lookup.data.status}`);
      results.push({ test: 'Lookup', status: 'PASS' });
    } else {
      console.log('❌ Employee lookup failed');
      console.log(`   Status: ${lookup.status}`);
      results.push({ test: 'Lookup', status: 'FAIL' });
    }
  } catch (error) {
    console.log('❌ Employee lookup error:', error.message);
    results.push({ test: 'Lookup', status: 'FAIL' });
  }
  
  // 5. Test Payroll Calculation (should fail without auth)
  console.log('\n5️⃣ Testing Payroll Calculation (Unauthenticated)...');
  try {
    const payroll = await makeRequest(`${RAILWAY_URL}/api/payroll/calculate`, {
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
    
    if (payroll.status === 401) {
      console.log('✅ Payroll authentication working (correctly blocked)');
      console.log(`   Expected: 401 Unauthorized`);
      console.log(`   Received: ${payroll.status} ${payroll.data.error}`);
      results.push({ test: 'Payroll Auth', status: 'PASS' });
    } else {
      console.log('⚠️ Payroll authentication unexpected response');
      console.log(`   Status: ${payroll.status}`);
      results.push({ test: 'Payroll Auth', status: 'WARN' });
    }
  } catch (error) {
    console.log('❌ Payroll calculation error:', error.message);
    results.push({ test: 'Payroll Auth', status: 'FAIL' });
  }
  
  // 6. Test Main Page
  console.log('\n6️⃣ Testing Main Page...');
  try {
    const mainPage = await makeRequest(`${RAILWAY_URL}/`);
    if (mainPage.status === 200) {
      console.log('✅ Main page working');
      console.log(`   Content-Type: ${mainPage.headers['content-type']}`);
      console.log(`   Contains login form: ${mainPage.data.includes('Iniciar Sesión')}`);
      results.push({ test: 'Main Page', status: 'PASS' });
    } else {
      console.log('❌ Main page failed');
      console.log(`   Status: ${mainPage.status}`);
      results.push({ test: 'Main Page', status: 'FAIL' });
    }
  } catch (error) {
    console.log('❌ Main page error:', error.message);
    results.push({ test: 'Main Page', status: 'FAIL' });
  }
  
  // 7. Test CORS Headers
  console.log('\n7️⃣ Testing CORS Configuration...');
  try {
    const corsTest = await makeRequest(`${RAILWAY_URL}/api/health`);
    const corsHeaders = corsTest.headers['access-control-allow-origin'];
    if (corsHeaders) {
      console.log('✅ CORS headers present');
      console.log(`   CORS Origin: ${corsHeaders}`);
      results.push({ test: 'CORS', status: 'PASS' });
    } else {
      console.log('⚠️ CORS headers missing');
      results.push({ test: 'CORS', status: 'WARN' });
    }
  } catch (error) {
    console.log('❌ CORS test error:', error.message);
    results.push({ test: 'CORS', status: 'FAIL' });
  }
  
  // Summary
  console.log('\n📊 RAILWAY SYSTEM TEST SUMMARY');
  console.log('==============================');
  
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const warnings = results.filter(r => r.status === 'WARN').length;
  
  results.forEach(result => {
    const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${icon} ${result.test}: ${result.status}`);
  });
  
  console.log(`\n🎯 Overall: ${passed}/${results.length} tests passed`);
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   ⚠️ Warnings: ${warnings}`);
  
  if (failed === 0) {
    console.log('\n🎉 All critical tests passed! Railway system is working correctly.');
  } else {
    console.log('\n⚠️ Some tests failed. Check the details above.');
  }
  
  // Save results to file
  const testResults = {
    timestamp: new Date().toISOString(),
    url: RAILWAY_URL,
    results: results,
    summary: {
      total: results.length,
      passed,
      failed,
      warnings
    }
  };
  
  fs.writeFileSync('railway-test-results.json', JSON.stringify(testResults, null, 2));
  console.log('\n📄 Test results saved to: railway-test-results.json');
}

// Run the test
testRailwaySystem().catch(console.error); 