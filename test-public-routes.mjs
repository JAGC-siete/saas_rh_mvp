#!/usr/bin/env node

/**
 * Script para probar las rutas públicas del sistema
 */

import fetch from 'node-fetch'

const BASE_URL = 'http://localhost:3001'
const PUBLIC_ROUTES_TO_TEST = [
  '/landing',
  '/activar', 
  '/demo',
  '/gracias',
  '/login'
]

async function testRoutes() {
  console.log('🧪 PROBANDO RUTAS PÚBLICAS')
  console.log('=' .repeat(50))

  let allPassed = true

  for (const route of PUBLIC_ROUTES_TO_TEST) {
    const url = `${BASE_URL}${route}`
    
    try {
      console.log(`\n🔍 Probando: ${url}`)
      
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'manual' // No seguir redirecciones para detectarlas
      })

      if (response.status === 200) {
        console.log(`✅ ${route} - Accesible (200)`)
      } else if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location')
        console.log(`❌ ${route} - Redirige a: ${location} (${response.status})`)
        allPassed = false
        
        if (location && location.includes('/login')) {
          console.log(`   🚨 PROBLEMA: Ruta pública redirigiendo a login!`)
        }
      } else {
        console.log(`❌ ${route} - Error: ${response.status}`)
        allPassed = false
      }

    } catch (error) {
      console.log(`❌ ${route} - Error de conexión: ${error.message}`)
      allPassed = false
    }
  }

  console.log('\n' + '='.repeat(50))
  if (allPassed) {
    console.log('🎉 TODAS LAS RUTAS PÚBLICAS FUNCIONAN CORRECTAMENTE')
  } else {
    console.log('⚠️ HAY RUTAS CON PROBLEMAS - Revisar middleware.ts')
  }
  
  return allPassed
}

// Función para probar específicamente /activar
async function testActivarRoute() {
  console.log('\n🎯 PRUEBA ESPECÍFICA DE /ACTIVAR')
  console.log('-'.repeat(40))

  const url = `${BASE_URL}/activar`
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'manual'
    })

    console.log(`Status: ${response.status}`)
    console.log(`Headers:`, Object.fromEntries(response.headers.entries()))

    if (response.status === 200) {
      console.log('✅ /activar es accesible sin autenticación')
      return true
    } else if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      console.log(`❌ /activar redirige a: ${location}`)
      
      if (location && location.includes('/login')) {
        console.log('🚨 PROBLEMA CONFIRMADO: Middleware bloqueando /activar')
        console.log('💡 Solución: Añadir \'/activar\' a PUBLIC_ROUTES en middleware.ts')
      }
      return false
    }

  } catch (error) {
    console.log(`Error: ${error.message}`)
    return false
  }
}

// Esperar un poco para que el servidor inicie
setTimeout(async () => {
  console.log('⏳ Esperando que el servidor inicie...\n')
  
  // Probar ruta específica primero
  const activarWorks = await testActivarRoute()
  
  // Luego probar todas las rutas
  const allWork = await testRoutes()
  
  if (activarWorks) {
    console.log('\n🎊 PROBLEMA RESUELTO: /activar ya no redirige a login')
  } else {
    console.log('\n🛠️ PROBLEMA PERSISTE: Revisar configuración del middleware')
  }
  
  process.exit(allWork && activarWorks ? 0 : 1)
  
}, 5000) // Esperar 5 segundos

console.log('🚀 Iniciando pruebas en 5 segundos...')
console.log('📍 Asegúrate de que npm run dev esté corriendo')
