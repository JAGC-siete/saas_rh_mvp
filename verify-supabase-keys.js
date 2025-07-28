// Script para verificar las claves de Supabase
const verifySupabaseKeys = () => {
  console.log('🔍 Verificando configuración de Supabase...\n')
  
  // Verificar variables de entorno
  const envVars = {
    'NEXT_PUBLIC_SUPABASE_URL': process.env.NEXT_PUBLIC_SUPABASE_URL,
    'NEXT_PUBLIC_SUPABASE_ANON_KEY': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    'SUPABASE_SERVICE_ROLE_KEY': process.env.SUPABASE_SERVICE_ROLE_KEY,
    'SUPABASE_URL': process.env.SUPABASE_URL,
    'SUPABASE_ANON_KEY': process.env.SUPABASE_ANON_KEY
  }
  
  console.log('📋 Variables de entorno:')
  Object.entries(envVars).forEach(([key, value]) => {
    if (value) {
      console.log(`✅ ${key}: ${value.substring(0, 20)}...`)
    } else {
      console.log(`❌ ${key}: NO CONFIGURADA`)
    }
  })
  
  console.log('\n🔍 Verificando configuración del cliente:')
  
  // Verificar si las claves principales están disponibles
  const hasUrl = !!(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL)
  const hasAnonKey = !!(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY)
  const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY
  
  console.log(`URL configurada: ${hasUrl ? '✅' : '❌'}`)
  console.log(`Anon Key configurada: ${hasAnonKey ? '✅' : '❌'}`)
  console.log(`Service Key configurada: ${hasServiceKey ? '✅' : '❌'}`)
  
  if (!hasUrl || !hasAnonKey) {
    console.log('\n⚠️  ADVERTENCIA: Claves principales faltantes')
    console.log('   - NEXT_PUBLIC_SUPABASE_URL o SUPABASE_URL')
    console.log('   - NEXT_PUBLIC_SUPABASE_ANON_KEY o SUPABASE_ANON_KEY')
  }
  
  if (!hasServiceKey) {
    console.log('\n⚠️  ADVERTENCIA: Service Role Key faltante')
    console.log('   - SUPABASE_SERVICE_ROLE_KEY')
  }
  
  // Verificar formato de las claves
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!url.includes('supabase.co')) {
      console.log('\n⚠️  ADVERTENCIA: URL de Supabase no parece válida')
      console.log(`   URL actual: ${url}`)
    }
  }
  
  if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!key.startsWith('eyJ')) {
      console.log('\n⚠️  ADVERTENCIA: Anon Key no parece tener formato JWT válido')
      console.log(`   Key actual: ${key.substring(0, 20)}...`)
    }
  }
  
  console.log('\n📋 Recomendaciones:')
  console.log('1. Verifica que las variables de entorno estén configuradas en Railway')
  console.log('2. Asegúrate de que las claves sean correctas desde tu proyecto de Supabase')
  console.log('3. Verifica que el proyecto de Supabase esté activo')
  console.log('4. Revisa los logs de Railway para errores de conexión')
}

// Ejecutar verificación
verifySupabaseKeys() 