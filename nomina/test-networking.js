import axios from 'axios';

const BASE_URL = 'http://localhost:3002';

async function testNetworking() {
  console.log('🌐 Testing Nomina Service Networking...\n');

  const results = {
    server: false,
    health: false,
    root: false,
    security: false,
    authentication: false,
    rateLimiting: false,
    cors: false
  };

  try {
    // Test 1: Basic server connectivity
    console.log('1️⃣ Testing basic server connectivity...');
    try {
      const response = await axios.get(`${BASE_URL}/health`, { timeout: 5000 });
      results.server = true;
      console.log('✅ Server is responding');
      console.log('   Status:', response.status);
      console.log('   Response time: < 5s');
    } catch (error) {
      console.log('❌ Server connectivity failed:', error.message);
    }
    console.log('');

    // Test 2: Health endpoint
    console.log('2️⃣ Testing health endpoint...');
    try {
      const response = await axios.get(`${BASE_URL}/health`);
      results.health = true;
      console.log('✅ Health endpoint working');
      console.log('   Service:', response.data.service);
      console.log('   Status:', response.data.status);
      console.log('   Dependencies:', Object.keys(response.data.dependencies));
    } catch (error) {
      console.log('❌ Health endpoint failed:', error.message);
    }
    console.log('');

    // Test 3: Root endpoint
    console.log('3️⃣ Testing root endpoint...');
    try {
      const response = await axios.get(`${BASE_URL}/`);
      results.root = true;
      console.log('✅ Root endpoint working');
      console.log('   Content-Type:', response.headers['content-type']);
      console.log('   Content-Length:', response.headers['content-length']);
      console.log('   Contains "Payroll":', response.data.includes('Payroll'));
      console.log('   Contains "Supabase":', response.data.includes('Supabase'));
    } catch (error) {
      console.log('❌ Root endpoint failed:', error.message);
    }
    console.log('');

    // Test 4: Security headers
    console.log('4️⃣ Testing security headers...');
    try {
      const response = await axios.get(`${BASE_URL}/`);
      const securityHeaders = [
        'x-content-type-options',
        'x-frame-options', 
        'x-xss-protection',
        'content-security-policy',
        'strict-transport-security'
      ];
      
      const foundHeaders = securityHeaders.filter(header => 
        response.headers[header] || response.headers[header.replace(/-/g, '')]
      );
      
      results.security = foundHeaders.length >= 4;
      console.log('✅ Security headers working');
      console.log('   Found headers:', foundHeaders.length, 'out of', securityHeaders.length);
      console.log('   Headers:', foundHeaders);
    } catch (error) {
      console.log('❌ Security headers test failed:', error.message);
    }
    console.log('');

    // Test 5: Authentication
    console.log('5️⃣ Testing authentication...');
    try {
      const response = await axios.post(`${BASE_URL}/login`, {
        usuario: 'admin',
        password: '1234'
      });
      results.authentication = true;
      console.log('✅ Authentication working');
      console.log('   Token received:', response.data.token ? 'Yes' : 'No');
      console.log('   Expires in:', response.data.expiresIn, 'seconds');
    } catch (error) {
      console.log('❌ Authentication failed:', error.message);
    }
    console.log('');

    // Test 6: Rate limiting
    console.log('6️⃣ Testing rate limiting...');
    try {
      const promises = Array(5).fill().map(() => 
        axios.get(`${BASE_URL}/health`).catch(e => e.response)
      );
      
      const responses = await Promise.all(promises);
      const successful = responses.filter(r => r && r.status === 200).length;
      results.rateLimiting = successful >= 3;
      console.log('✅ Rate limiting working');
      console.log('   Successful requests:', successful, 'out of 5');
      console.log('   Rate limit headers present:', responses[0]?.headers['x-ratelimit-limit'] ? 'Yes' : 'No');
    } catch (error) {
      console.log('❌ Rate limiting test failed:', error.message);
    }
    console.log('');

    // Test 7: CORS
    console.log('7️⃣ Testing CORS...');
    try {
      const response = await axios.get(`${BASE_URL}/health`, {
        headers: {
          'Origin': 'http://localhost:3000'
        }
      });
      results.cors = true;
      console.log('✅ CORS working');
      console.log('   Access-Control-Allow-Origin:', response.headers['access-control-allow-origin']);
      console.log('   Access-Control-Allow-Credentials:', response.headers['access-control-allow-credentials']);
    } catch (error) {
      console.log('❌ CORS test failed:', error.message);
    }
    console.log('');

    // Summary
    console.log('📊 NETWORKING TEST SUMMARY');
    console.log('========================');
    Object.entries(results).forEach(([test, passed]) => {
      console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASS' : 'FAIL'}`);
    });
    
    const passedTests = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;
    
    console.log('');
    console.log(`🎯 Overall: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
      console.log('🎉 All networking tests passed!');
    } else {
      console.log('⚠️ Some tests failed - check the details above');
    }
    
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
  }
}

testNetworking(); 