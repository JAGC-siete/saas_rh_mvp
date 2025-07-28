// Script de prueba para verificar la autenticación
const testAuth = async () => {
  const baseUrl = 'https://humanosisu.net'
  
  console.log('🧪 Probando autenticación...')
  
  // Caso 1: Verificar que la página de login carga
  console.log('\n📋 Caso 1: Verificar página de login')
  try {
    const response1 = await fetch(`${baseUrl}/login`)
    console.log('Status:', response1.status)
    console.log('Content-Type:', response1.headers.get('content-type'))
    
    if (response1.status === 200) {
      console.log('✅ Página de login carga correctamente')
    } else {
      console.log('❌ Error cargando página de login')
    }
  } catch (error) {
    console.error('Error:', error.message)
  }
  
  // Caso 2: Verificar endpoint de prueba
  console.log('\n📋 Caso 2: Verificar endpoint de prueba')
  try {
    const response2 = await fetch(`${baseUrl}/api/test`)
    console.log('Status:', response2.status)
    
    if (response2.status === 200) {
      const data = await response2.json()
      console.log('✅ Endpoint de prueba funciona:', data)
    } else {
      console.log('❌ Endpoint de prueba no funciona')
    }
  } catch (error) {
    console.error('Error:', error.message)
  }
  
  // Caso 3: Verificar endpoint de salud
  console.log('\n📋 Caso 3: Verificar endpoint de salud')
  try {
    const response3 = await fetch(`${baseUrl}/api/health`)
    console.log('Status:', response3.status)
    
    if (response3.status === 200) {
      const data = await response3.json()
      console.log('✅ Endpoint de salud funciona:', data)
    } else {
      console.log('❌ Endpoint de salud no funciona')
    }
  } catch (error) {
    console.error('Error:', error.message)
  }
  
  // Caso 4: Verificar página principal
  console.log('\n📋 Caso 4: Verificar página principal')
  try {
    const response4 = await fetch(`${baseUrl}/`)
    console.log('Status:', response4.status)
    
    if (response4.status === 200) {
      console.log('✅ Página principal carga correctamente')
    } else {
      console.log('❌ Error cargando página principal')
    }
  } catch (error) {
    console.error('Error:', error.message)
  }
}

// Ejecutar pruebas
testAuth() 