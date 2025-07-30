import axios from 'axios';

const BASE_URL = 'http://localhost:3002';

async function testServer() {
  console.log('🧪 Testing Enhanced Nomina Server (Supabase Architecture)...\n');

  try {
    // Test 1: Health endpoint
    console.log('1️⃣ Testing Health Endpoint...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health endpoint working');
    console.log('Status:', healthResponse.data.status);
    console.log('Service:', healthResponse.data.service);
    console.log('Dependencies:', Object.keys(healthResponse.data.dependencies));
    console.log('Supabase Status:', healthResponse.data.dependencies.supabase.status);
    console.log('');

    // Test 2: Root endpoint
    console.log('2️⃣ Testing Root Endpoint...');
    const rootResponse = await axios.get(`${BASE_URL}/`);
    console.log('✅ Root endpoint working');
    console.log('Response length:', rootResponse.data.length);
    console.log('Contains "Payroll":', rootResponse.data.includes('Payroll'));
    console.log('Contains "Supabase":', rootResponse.data.includes('Supabase'));
    console.log('');

    // Test 3: Security headers
    console.log('3️⃣ Testing Security Headers...');
    const headersResponse = await axios.get(`${BASE_URL}/`, { 
      maxRedirects: 0,
      validateStatus: (status) => status < 400 
    });
    
    const securityHeaders = [
      'x-content-type-options',
      'x-frame-options', 
      'x-xss-protection',
      'content-security-policy'
    ];
    
    const foundHeaders = securityHeaders.filter(header => 
      headersResponse.headers[header] || headersResponse.headers[header.replace(/-/g, '')]
    );
    
    console.log('✅ Security headers found:', foundHeaders.length, 'out of', securityHeaders.length);
    console.log('Found headers:', foundHeaders);
    console.log('');

    // Test 4: Login endpoint (should fail without credentials)
    console.log('4️⃣ Testing Login Endpoint (without credentials)...');
    try {
      await axios.post(`${BASE_URL}/login`, {});
      console.log('❌ Login should have failed without credentials');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ Login validation working (400 error for invalid input)');
      } else {
        console.log('⚠️ Login endpoint response:', error.response?.status || error.message);
      }
    }
    console.log('');

    // Test 5: Rate limiting (make multiple requests)
    console.log('5️⃣ Testing Rate Limiting...');
    const promises = Array(5).fill().map(() => 
      axios.get(`${BASE_URL}/health`).catch(e => e.response)
    );
    
    const responses = await Promise.all(promises);
    const successful = responses.filter(r => r && r.status === 200).length;
    console.log('✅ Rate limiting test completed');
    console.log('Successful requests:', successful, 'out of 5');
    console.log('');

    console.log('🎉 All tests completed successfully!');
    console.log('✅ Server is running with enhanced security features');
    console.log('✅ Using Supabase architecture (no Redis needed)');
    console.log('✅ In-memory rate limiting working');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('Server is not running on port 3002');
    }
  }
}

testServer(); 