// Script de prueba para el endpoint de asistencia
const testAttendanceEndpoint = async () => {
  const baseUrl = 'https://humanosisu.net'
  const endpoint = '/api/attendance/register'
  
  console.log('🧪 Probando endpoint de asistencia...')
  
  // Caso 1: Empleado no encontrado
  console.log('\n📋 Caso 1: Empleado no encontrado')
  try {
    const response1 = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        last5: '99999',
        company_id: 'test-company'
      })
    })
    const data1 = await response1.json()
    console.log('Status:', response1.status)
    console.log('Response:', data1)
  } catch (error) {
    console.error('Error:', error.message)
  }
  
  // Caso 2: Parámetros faltantes
  console.log('\n📋 Caso 2: Parámetros faltantes')
  try {
    const response2 = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company_id: 'test-company'
      })
    })
    const data2 = await response2.json()
    console.log('Status:', response2.status)
    console.log('Response:', data2)
  } catch (error) {
    console.error('Error:', error.message)
  }
  
  // Caso 3: Método no permitido
  console.log('\n📋 Caso 3: Método GET (no permitido)')
  try {
    const response3 = await fetch(`${baseUrl}${endpoint}`, {
      method: 'GET'
    })
    const data3 = await response3.json()
    console.log('Status:', response3.status)
    console.log('Response:', data3)
  } catch (error) {
    console.error('Error:', error.message)
  }
}

// Ejecutar pruebas
testAttendanceEndpoint() 