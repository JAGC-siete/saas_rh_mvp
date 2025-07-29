const fetch = require('node-fetch')

async function testLookupAPI() {
  console.log('🧪 Probando API de lookup...')
  
  const testCases = [
    { last5: '00731', description: 'Jorge Arturo (últimos 5)' },
    { last5: '00731', description: 'Jorge Arturo (últimos 5) - segunda prueba' },
    { last5: '12345', description: 'María González (últimos 5)' },
    { last5: '67890', description: 'Carlos Rodríguez (últimos 5)' }
  ]

  for (const testCase of testCases) {
    console.log(`\n🔍 Probando: ${testCase.description}`)
    console.log(`📝 last5: ${testCase.last5}`)
    
    try {
      const response = await fetch('https://zesty-abundance-production.up.railway.app/api/attendance/lookup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ last5: testCase.last5 })
      })

      const data = await response.json()
      
      if (response.ok) {
        console.log('✅ Éxito:', data)
      } else {
        console.log('❌ Error:', data)
      }
      
    } catch (error) {
      console.error('❌ Error de conexión:', error.message)
    }
  }
}

testLookupAPI() 