// 🔧 TEST FETCH SIMPLE - Verificar que el fetch funciona
// Ejecutar: node test-fetch-simple.js

const BASE_URL = 'https://zesty-abundance-production.up.railway.app';

async function testFetch() {
  console.log('🧪 PROBANDO FETCH A PAYROLL CALCULATE...\n');

  try {
    // Datos de prueba para payroll
    const testData = {
      period: '2025-01',
      fortnight: 1,
      includeDeductions: false
    };

    console.log('📤 Enviando datos:', testData);
    console.log('🎯 URL:', `${BASE_URL}/api/payroll/calculate`);

    const response = await fetch(`${BASE_URL}/api/payroll/calculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    console.log('\n📥 RESPUESTA:');
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));

    if (response.ok) {
      const data = await response.json();
      console.log('✅ ÉXITO - Datos recibidos:', data);
    } else {
      const errorText = await response.text();
      console.log('❌ ERROR - Respuesta:', errorText);
    }

  } catch (error) {
    console.log('💥 ERROR DE RED:', error.message);
    
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      console.log('💡 SUGERENCIA: Este error indica que fetch no está disponible');
      console.log('💡 Esto puede ser un problema de CSP o CORS');
    }
  }
}

// Ejecutar test
testFetch(); 