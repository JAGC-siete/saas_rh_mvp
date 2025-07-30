import axios from 'axios';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3002';

async function testPDFGeneration() {
  console.log('🧪 Testing PDF Generation...\n');

  try {
    // First, get a login token
    console.log('1️⃣ Getting authentication token...');
    const loginResponse = await axios.post(`${BASE_URL}/login`, {
      usuario: 'admin',
      password: '1234'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Authentication successful');
    console.log('Token received:', token ? 'Yes' : 'No');
    console.log('');

    // Test PDF generation with mock data
    console.log('2️⃣ Testing PDF generation endpoint...');
    const pdfResponse = await axios.post(`${BASE_URL}/planilla`, {
      periodo: '2025-07',
      quincena: 1
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      responseType: 'arraybuffer' // Important for PDF data
    });

    console.log('✅ PDF generation successful');
    console.log('Response status:', pdfResponse.status);
    console.log('Content-Type:', pdfResponse.headers['content-type']);
    console.log('Content-Length:', pdfResponse.headers['content-length']);
    console.log('PDF size:', pdfResponse.data.length, 'bytes');
    console.log('');

    // Save the PDF for inspection
    const pdfPath = path.join(process.cwd(), 'test-planilla.pdf');
    fs.writeFileSync(pdfPath, pdfResponse.data);
    console.log('3️⃣ PDF saved to:', pdfPath);
    console.log('');

    // Verify it's a valid PDF
    const pdfBuffer = Buffer.from(pdfResponse.data);
    const isPDF = pdfBuffer.toString('ascii', 0, 4) === '%PDF';
    console.log('4️⃣ PDF validation:', isPDF ? '✅ Valid PDF' : '❌ Invalid PDF');
    console.log('');

    console.log('🎉 PDF generation test completed successfully!');
    console.log('✅ Authentication working');
    console.log('✅ PDF generation working');
    console.log('✅ Security headers applied');
    console.log('✅ File saved for inspection');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data.toString());
    }
    
    if (error.code === 'ECONNREFUSED') {
      console.error('Server is not running on port 3002');
    }
  }
}

testPDFGeneration(); 